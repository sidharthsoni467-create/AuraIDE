cmake_minimum_required(VERSION 3.16)
project(AuraIDEServer)

set(CMAKE_CXX_STANDARD 17)

add_executable(tcp_server
    server/tcp_server.cpp
    server/ot_engine.cpp
)

# Link WinSock2 on Windows
if(WIN32)
    target_link_libraries(tcp_server ws2_32)
endif()

target_include_directories(tcp_server PRIVATE server/)

