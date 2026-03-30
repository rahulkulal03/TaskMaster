const fs = require('fs');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

blueprint.entities.User = {
  "title": "User",
  "description": "User login details.",
  "type": "object",
  "properties": {
    "uid": {
      "type": "string",
      "description": "The user ID."
    },
    "email": {
      "type": "string",
      "description": "The user's email address."
    },
    "displayName": {
      "type": "string",
      "description": "The user's display name."
    },
    "photoURL": {
      "type": "string",
      "description": "The user's photo URL."
    },
    "isAnonymous": {
      "type": "boolean",
      "description": "Whether the user is anonymous."
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the user was created."
    },
    "lastLogin": {
      "type": "string",
      "format": "date-time",
      "description": "When the user last logged in."
    }
  },
  "required": ["uid"]
};

blueprint.firestore["/users/{userId}"] = {
  "schema": { "$ref": "#/entities/User" },
  "description": "User login details."
};

fs.writeFileSync('firebase-blueprint.json', JSON.stringify(blueprint, null, 2));
console.log('Updated firebase-blueprint.json');
