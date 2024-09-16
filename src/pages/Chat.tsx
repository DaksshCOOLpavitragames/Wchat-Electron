import { FC, useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router-dom";
import  firebaseConfig  from "../FirebaseConfig";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set } from "firebase/database";
import { getAuth, signOut } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

interface Message {
  sender: string;
  message: string;
  timestamp: string;
}

export const ChatPage: FC = () => {
  const [users, setUsers] = useState<string[]>([]);
  const [groups, setGroups] = useState<{ name: string; members: string[] }[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [messages, setMessages] = useState<Record<string, Message>>({});
  const [newMessage, setNewMessage] = useState<string>("");
  const [groupName, setGroupName] = useState<string>("");
  const [groupUsers, setGroupUsers] = useState<string[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const navigate = useNavigate();
  const storedUsername = localStorage.getItem("username");

  useEffect(() => {
    const usersRef = ref(database, "users");
    const groupsRef = ref(database, "groups");
  
    // Fetch users
    onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        const userList = Object.keys(usersData).filter((username) => username !== storedUsername);
        setUsers(userList);
        setAvailableUsers(userList);
      }
    });
  
    // Fetch groups
    onValue(groupsRef, (snapshot) => {
      const groupsData = snapshot.val();
      if (groupsData) {
        const userGroups = Object.keys(groupsData).filter((group) => {
          const members = groupsData[group]?.members || [];
          return members.includes(storedUsername!);
        });
        const groupList = userGroups.map((group) => ({
          name: group,
          members: groupsData[group]?.members || [],
        }));
        setGroups(groupList);
      }
    });
  }, [storedUsername]);
  

  const openChat = (chat: string, group: boolean = false) => {
    setSelectedChat(chat);
    setIsGroup(group);

    const chatRef = ref(database, group ? `groups/${chat}/messages` : `chats/${storedUsername}/${chat}`);
    onValue(chatRef, (snapshot) => {
      const messagesData = snapshot.val();
      setMessages(messagesData || {});
    });

    if (group) {
      const groupRef = ref(database, `groups/${chat}`);
      onValue(groupRef, (snapshot) => {
        const groupData = snapshot.val();
        setGroupUsers(groupData?.members || []);
      });
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      const timestamp = new Date().toISOString();
      const messageData: Message = {
        sender: storedUsername!,
        message: newMessage,
        timestamp,
      };
  
      // For direct messages
      if (!isGroup) {
        // Save message for sender
        const senderChatRef = ref(database, `chats/${storedUsername}/${selectedChat}`);
        const messageId = push(senderChatRef).key;
        set(ref(database, `chats/${storedUsername}/${selectedChat}/${messageId}`), messageData);
  
        // Save message for recipient
        const recipientChatRef = ref(database, `chats/${selectedChat}/${storedUsername}`);
        set(ref(database, `chats/${selectedChat}/${storedUsername}/${messageId}`), messageData);
      } else {
        // For group messages
        const groupChatRef = ref(database, `groups/${selectedChat}/messages`);
        const messageId = push(groupChatRef).key;
        set(ref(database, `groups/${selectedChat}/messages/${messageId}`), messageData);
      }
  
      setNewMessage("");
    }
  };
  
  const handleFileUpload = (file: File) => {
    const fileRef = storageRef(storage, `uploads/${storedUsername}/${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on("state_changed", (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      setUploadProgress(progress);
    },
    (error) => {
      console.error("Upload failed", error);
      setUploadProgress(null);
    },
    () => {
      getDownloadURL(uploadTask.snapshot.ref).then((url) => {
        const chatRef = ref(database, isGroup ? `groups/${selectedChat}/messages` : `chats/${storedUsername}/${selectedChat}`);
        const messageId = push(chatRef).key;
        const timestamp = new Date().toISOString();

        const messageData: Message = {
          sender: storedUsername!,
          message: `File: ${url}`,
          timestamp,
        };

        set(ref(database, `${isGroup ? `groups/${selectedChat}/messages/${messageId}` : `chats/${storedUsername}/${selectedChat}/${messageId}`}`), messageData);
        setUploadProgress(null);
      });
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return date.toLocaleString(undefined, options);
  };

  const renderFilePreview = (text: string) => {
    // Regex to detect URL patterns and extract clean URLs
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|$!:,.;]*[-A-Z0-9+&@#\/%=~_|$])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|$!:,.;]*[-A-Z0-9+&@#\/%=~_|$])/gi;
  
    // Split text by URL patterns
    const parts = text.split(urlRegex);
  
    // Function to clean up URL by removing unwanted trailing characters
    const cleanUrl = (url: string) => {
      // Remove trailing characters after a valid URL
      return url.replace(/(https?:\/\/[^\s]*)(\s|$)/, '$1');
    };
  
    return (
      <>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            // Clean up the URL
            const cleanedPart = cleanUrl(part);
            const isImage = /\.(jpeg|jpg|gif|png)$/i.test(cleanedPart);
            const formattedUrl = cleanedPart.startsWith('www.') ? `http://${cleanedPart}` : cleanedPart;
  
            return isImage ? (
              <img
                key={index}
                src={formattedUrl}
                alt="Uploaded file"
                className="w-64 h-auto"
              />
            ) : (
              <a
                key={index}
                href={formattedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                {formattedUrl}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };
  

  return (
    <Layout>
      <div className="flex fixed w-screen">
        {/* Sidebar */}
        <div className="w-1/4 bg-black h-screen p-4">
          <h2 className="text-xl font-bold text-white mb-4">Chats</h2>

          {/* Users */}
          <ul className="mb-6">
            {users.map((user) => (
              <li
                key={user}
                className="mb-2 p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-600 text-white"
                onClick={() => openChat(user)}
              >
                {user}
              </li>
            ))}
          </ul>

          {/* Groups */}
          <h2 className="text-xl font-bold text-white mb-4">Groups</h2>
          <ul>
            {groups.map((group) => (
              <li
                key={group.name}
                className="mb-2 p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-600 text-white"
                onClick={() => openChat(group.name, true)}
              >
                {group.name}
              </li>
            ))}
          </ul>

          {/* Create Group Button */}
          <button
            onClick={() => setShowCreateGroup(true)}
            className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg"
          >
            Create Group
          </button>

          {/* Profile Button */}
          <button
            onClick={() => setShowProfile(true)}
            className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg"
          >
            Profile
          </button>

          {showProfile && (
            <div className="mt-4 bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg text-white">Profile</h3>
              <p className="text-white">Username: {storedUsername}</p>
              <button
                onClick={() => signOut(auth)
                  .then(() => navigate("/Index"))
                  .catch((error) => console.error("Sign out error", error))}
                className="mt-4 bg-red-500 text-white py-2 px-4 rounded-lg"
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowProfile(false)}
                className="mt-4 bg-slate-600 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="w-3/4 bg-black h-screen p-4 flex flex-col">
          {/* Display Chat Partner or Group Info */}
          <div className="mb-4 p-2 bg-gray-800 text-white rounded-lg">
            {isGroup ? (
              <>
                <h3 className="text-xl font-bold">{selectedChat}</h3>
                <p>Members: {groupUsers.join(", ")}</p>
              </>
            ) : (
              <h3 className="text-xl font-bold">{selectedChat}</h3>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4">
  {Object.keys(messages).map((messageId) => {
    const message = messages[messageId];
    const isOwnMessage = message.sender === storedUsername;

    return (
      <div
        key={messageId}
        className={`mb-4 p-2 rounded-lg ${isOwnMessage ? "bg-blue-500 text-white self-end" : "bg-gray-800 text-white self-start"}`}
      >
        <div className="font-bold text-sm">
          {message.sender}
        </div>
        <p>
          {renderFilePreview(message.message)}
        </p>
        <p className="text-sm mt-1">{formatTimestamp(message.timestamp)}</p>
      </div>
    );
  })}
</div>



          {/* New Message Input */}
          <div className="flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 p-2 rounded-lg bg-gray-700 text-white"
              placeholder="Type a message"
            />
            <button
              onClick={sendMessage}
              className="ml-2 bg-blue-500 text-white py-2 px-4 rounded-lg"
            >
              Send
            </button>
          </div>

          {/* File Upload Indicator */}
          {uploadProgress !== null && (
            <div className="mt-2 text-white">
              Upload progress: {uploadProgress.toFixed(2)}%
            </div>
          )}

          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="mt-4 p-4 border-2 border-dashed border-gray-500 rounded-lg text-white"
          >
            Drag and drop files here to upload
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl text-white mb-4">Create Group</h2>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="p-2 mb-4 w-full rounded-lg bg-gray-700 text-white"
              placeholder="Group Name"
            />
            <h3 className="text-lg text-white mb-2">Add Members:</h3>
            <ul className="mb-4">
              {availableUsers.map((user) => (
                <li key={user}>
                  <label className="text-white">
                    <input
                      type="checkbox"
                      value={user}
                      onChange={(e) =>
                        setGroupUsers(
                          e.target.checked
                            ? [...groupUsers, user]
                            : groupUsers.filter((u) => u !== user)
                        )
                      }
                      className="mr-2"
                    />
                    {user}
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                const groupRef = ref(database, `groups/${groupName}`);
                set(groupRef, {
                  members: [...groupUsers, storedUsername!],
                  messages: {},
                });
                setShowCreateGroup(false);
              }}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg"
            >
              Create Group
            </button>
            <button
              onClick={() => setShowCreateGroup(false)}
              className="ml-2 bg-red-500 text-white py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};
