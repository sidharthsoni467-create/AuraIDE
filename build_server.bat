@echo off
mkdir build 2>nul
cd build
cmake .. -G "MinGW Makefiles"
cmake --build .
echo.
echo Build complete. Run: build\tcp_server.exe

