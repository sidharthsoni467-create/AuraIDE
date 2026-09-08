#pragma once
#include <string>

struct Operation {
    std::string type;      // "insert" or "delete"
    int position;          // character offset in document
    std::string text;      // text to insert (empty for delete)
    int length;            // number of chars to delete (0 for insert)
    int revision;          // document revision this op was written against
    std::string client_id; // which client sent this
};

// Transforms op against server_revision worth of already-applied ops.
// Adjusts op.position in-place. Call before applying to document.
Operation transform(Operation op, int server_revision);

// Applies op to document string. Modifies doc in-place.
void apply_operation(const Operation& op, std::string& doc);

// Serializes Operation to JSON string (newline-terminated).
std::string serialize_op(const Operation& op, int current_revision);

// Parses JSON string into Operation struct.
Operation parse_op(const std::string& json_str);

