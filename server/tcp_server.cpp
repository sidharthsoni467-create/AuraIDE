#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <algorithm>
#include <cstring>
#include <sstream>
#include "ot_engine.h"
#include "json.hpp"

using json = nlohmann::json;

std::vector<SOCKET> connected_clients;
std::mutex clients_mutex;
std::string document_state = "";
std::mutex doc_mutex;
int server_revision = 0;

void broadcast(std::string message, SOCKET sender) {
    std::lock_guard<std::mutex> lock(clients_mutex);
    for (SOCKET client : connected_clients) {
        if (client != sender) {
            send(client, message.c_str(), message.length(), 0);
        }
    }
}

void handle_client(SOCKET client_socket) {
    char buffer[4096];
    std::string data_stream = "";
    
    while (true) {
        int bytes_received = recv(client_socket, buffer, sizeof(buffer), 0);
        if (bytes_received <= 0) {
            std::lock_guard<std::mutex> lock(clients_mutex);
            connected_clients.erase(std::remove(connected_clients.begin(), connected_clients.end(), client_socket), connected_clients.end());
            closesocket(client_socket);
            break;
        }
        
        data_stream.append(buffer, bytes_received);
        size_t pos;
        while ((pos = data_stream.find('\n')) != std::string::npos) {
            std::string msg = data_stream.substr(0, pos);
            data_stream.erase(0, pos + 1);
            
            try {
                json j = json::parse(msg);
                
                if (j.contains("type") && j["type"] == "join") {
                    broadcast(msg + "\n", client_socket);
                    continue;
                }
                
                Operation incoming_op = parse_op(msg);
                
                std::lock_guard<std::mutex> lock(doc_mutex);
                incoming_op = transform(incoming_op, server_revision);
                apply_operation(incoming_op, document_state);
                server_revision++;
                std::string out_msg = serialize_op(incoming_op, server_revision);
                
                broadcast(out_msg, client_socket);
            } catch (const std::exception& e) {
                std::cerr << "Error parsing JSON: " << e.what() << std::endl;
            }
        }
    }
}

int main() {
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        std::cerr << "WSAStartup failed." << std::endl;
        return 1;
    }

    SOCKET server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed." << std::endl;
        WSACleanup();
        return 1;
    }

    int opt = 1;
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

    sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(9091);

    if (bind(server_socket, (sockaddr*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        std::cerr << "Bind failed." << std::endl;
        closesocket(server_socket);
        WSACleanup();
        return 1;
    }

    if (listen(server_socket, 10) == SOCKET_ERROR) {
        std::cerr << "Listen failed." << std::endl;
        closesocket(server_socket);
        WSACleanup();
        return 1;
    }

    std::cout << "TCP server listening on port 9091..." << std::endl;

    while (true) {
        sockaddr_in client_addr;
        int client_size = sizeof(client_addr);
        SOCKET client_socket = accept(server_socket, (sockaddr*)&client_addr, &client_size);
        
        if (client_socket != INVALID_SOCKET) {
            {
                std::lock_guard<std::mutex> lock(clients_mutex);
                connected_clients.push_back(client_socket);
            }
            std::thread(handle_client, client_socket).detach();
        }
    }

    WSACleanup();
    return 0;
}

