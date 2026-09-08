#include "ot_engine.h"
#include "json.hpp"
#include <vector>
#include <mutex>
#include <algorithm>

using json = nlohmann::json;

std::vector<Operation> history;
std::mutex history_mutex;

Operation transform(Operation op, int server_revision) {
    std::lock_guard<std::mutex> lock(history_mutex);
    
    for (const Operation& hist_op : history) {
        if (hist_op.revision >= op.revision) {
            if (op.type == "insert" && hist_op.type == "insert") {
                if (hist_op.position < op.position || (hist_op.position == op.position && hist_op.client_id < op.client_id)) {
                    op.position += hist_op.text.length();
                }
            } else if (op.type == "insert" && hist_op.type == "delete") {
                if (hist_op.position < op.position) {
                    if (hist_op.position + hist_op.length > op.position) {
                        op.position = hist_op.position;
                    } else {
                        op.position -= hist_op.length;
                    }
                }
            } else if (op.type == "delete" && hist_op.type == "insert") {
                if (hist_op.position <= op.position) {
                    op.position += hist_op.text.length();
                }
            } else if (op.type == "delete" && hist_op.type == "delete") {
                if (hist_op.position <= op.position) {
                    if (hist_op.position + hist_op.length > op.position) {
                        int overlap = std::min(op.length, (hist_op.position + hist_op.length) - op.position);
                        op.position = hist_op.position;
                        op.length -= overlap;
                    } else {
                        op.position -= hist_op.length;
                    }
                }
            }
        }
    }
    
    Operation logged_op = op;
    logged_op.revision = server_revision;
    history.push_back(logged_op);
    
    return op;
}

void apply_operation(const Operation& op, std::string& doc) {
    if (op.type == "insert") {
        int pos = std::min(op.position, (int)doc.length());
        doc.insert(pos, op.text);
    } else if (op.type == "delete") {
        if (op.position < (int)doc.length()) {
            int len = std::min(op.length, (int)doc.length() - op.position);
            if (len > 0) {
                doc.erase(op.position, len);
            }
        }
    }
}

std::string serialize_op(const Operation& op, int current_revision) {
    json j;
    j["type"] = op.type;
    j["position"] = op.position;
    j["text"] = op.text;
    j["length"] = op.length;
    j["revision"] = current_revision;
    j["client_id"] = op.client_id;
    return j.dump() + "\n";
}

Operation parse_op(const std::string& json_str) {
    json j = json::parse(json_str);
    Operation op;
    op.type = j.value("type", "");
    op.position = j.value("position", 0);
    op.text = j.value("text", "");
    op.length = j.value("length", 0);
    op.revision = j.value("revision", 0);
    op.client_id = j.value("client_id", "");
    return op;
}

