BEGIN TRANSACTION;
CREATE TABLE webmail_folders (folder_hierarchy STRING, folder_id INTEGER PRIMARY KEY, folder_name STRING, user_id INTEGER);
CREATE TABLE webmail_message (attachment BOOLEAN, date TEXT, delete_msg BOOLEAN, folder_id INTEGER, sender STRING, href TEXT, msg_id INTEGER PRIMARY KEY, read BOOLEAN, size INTEGER, subject TEXT, time TEXT, recipient TEXT, user_id INTEGER);
CREATE TABLE webmail_subscribe_list (folder_name STRING, user_id INTEGER);
CREATE TABLE webmail_user (user_id INTEGER PRIMARY KEY, user_name TEXT);
CREATE TABLE webmail_schema_version (version INTEGER);
INSERT INTO webmail_schema_version VALUES(1);
CREATE TRIGGER webmail_delete_user AFTER  DELETE ON webmail_user
BEGIN
       DELETE FROM webmail_subscribe_list WHERE user_id = OLD.user_id;
       DELETE FROM webmail_folders WHERE user_id = OLD.user_id; 
       DELETE FROM webmail_message WHERE user_id = OLD.user_id;   
END;
COMMIT;
