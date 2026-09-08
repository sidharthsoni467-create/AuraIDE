import socket
import json
import threading
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from model.inference import ModelPredictor

def handle_client(conn, addr, predictor):
    data_buffer = ""
    try:
        while True:
            data = conn.recv(4096)
            if not data:
                break
            
            data_buffer += data.decode('utf-8')
            
            if "\r\n\r\n" in data_buffer:
                headers_part, body_part = data_buffer.split("\r\n\r\n", 1)
                
                if headers_part.startswith("OPTIONS"):
                    # Handle CORS preflight
                    resp = (
                        "HTTP/1.1 204 No Content\r\n"
                        "Access-Control-Allow-Origin: *\r\n"
                        "Access-Control-Allow-Methods: POST, OPTIONS\r\n"
                        "Access-Control-Allow-Headers: Content-Type\r\n"
                        "Connection: close\r\n\r\n"
                    )
                    conn.sendall(resp.encode('utf-8'))
                    break
                    
                content_length = 0
                for line in headers_part.split("\r\n"):
                    if line.lower().startswith("content-length:"):
                        content_length = int(line.split(":")[1].strip())
                
                if len(body_part) >= content_length:
                    body = body_part[:content_length]
                    
                    try:
                        req = json.loads(body)
                        context = req.get("context", "")
                        k = req.get("k", 5)
                        
                        next_token = predictor.predict_next_token(context)
                        top_k = predictor.predict_top_k(context, k=k)
                        
                        print(f"Context: {context[-20:].strip()!r} --> Predicted: {next_token!r}")
                        
                        resp_json = json.dumps({"next_token": next_token, "top_k": top_k})
                        
                        http_resp = (
                            "HTTP/1.1 200 OK\r\n"
                            "Content-Type: application/json\r\n"
                            "Access-Control-Allow-Origin: *\r\n"
                            f"Content-Length: {len(resp_json)}\r\n"
                            "Connection: close\r\n\r\n"
                            f"{resp_json}"
                        )
                        conn.sendall(http_resp.encode('utf-8'))
                    except Exception as e:
                        print(f"Error handling request: {e}")
                    
                    break
                    
    except (ConnectionResetError, BrokenPipeError):
        pass
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        conn.close()

def main():
    predictor = ModelPredictor()
    HOST = "localhost"
    PORT = 8001
    
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((HOST, PORT))
    server_socket.listen()
    server_socket.settimeout(1.0)
    
    print(f"AI socket server listening on {HOST}:{PORT}...")
    try:
        while True:
            try:
                conn, addr = server_socket.accept()
                conn.settimeout(None)
                t = threading.Thread(target=handle_client, args=(conn, addr, predictor), daemon=True)
                t.start()
            except socket.timeout:
                continue
    except KeyboardInterrupt:
        print("\nShutting down AI server...")
    finally:
        server_socket.close()

if __name__ == "__main__":
    main()
