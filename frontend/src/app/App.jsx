import "./App.css";
import Editor from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { useRef, useMemo, useState, useEffect } from "react";

function App() {
  
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const typingTimerRef = useRef(null);
  
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState("javascript");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  
  const ydoc = useMemo(() => new Y.Doc(), []);

  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const yMeta = useMemo(() => ydoc.getMap("metadata"), [ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;

    bindingRef.current = new MonacoBinding(
      yText,

      editor.getModel(),

      new Set([editor]),
    );

   
    editor.onKeyDown(() => {
      const provider = providerRef.current;

      if (!provider) return;

      provider.awareness.setLocalStateField("typing", true);

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = setTimeout(() => {
        const currentProvider = providerRef.current;

        if (!currentProvider) return;

        currentProvider.awareness.setLocalStateField("typing", false);
      }, 1000);
    });
  };


  const createRoom = async (e) => {
    e.preventDefault();

    const name = e.target.name.value.trim();

    if (!name) {
      setError("Please enter your name.");

      return;
    }

    try {
      setLoading(true);

      setError("");

      const response = await fetch("http://localhost:3000/api/rooms", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create room.");

        return;
      }

      setUsername(name);

      setRoomId(data.roomId);

      window.history.pushState({}, "", `?room=${data.roomId}`);
    } catch (error) {
      console.error(error);

      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };


  const joinRoom = async (e) => {
    e.preventDefault();

    const name = e.target.name.value.trim();

    const enteredRoomId = e.target.roomId.value.trim();

    if (!name) {
      setError("Please enter your name.");

      return;
    }
    if (!/^\d{6}$/.test(enteredRoomId)) {
      setError("Room ID must be exactly 6 digits.");

      return;
    }

    try {
      setLoading(true);

      setError("");

      const response = await fetch("http://localhost:3000/api/rooms/join", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          roomId: enteredRoomId,

          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to join room.");

        return;
      }

      setUsername(name);

      setRoomId(data.roomId);

      window.history.pushState({}, "", `?room=${data.roomId}`);
    } catch (error) {
      console.error(error);

      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };


  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy Room ID:", error);
    }
  };


  const leaveRoom = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);

      typingTimerRef.current = null;
    }

    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField("user", null);

      providerRef.current.awareness.setLocalStateField("typing", false);

      providerRef.current.disconnect();

      providerRef.current = null;
    }

    if (bindingRef.current) {
      bindingRef.current.destroy();

      bindingRef.current = null;
    }

    setUsers([]);

    setUsername("");

    setRoomId(null);

    setLanguage("javascript");

    setCopied(false);

    setError("");

    window.history.pushState({}, "", window.location.pathname);
  };

  useEffect(() => {
    if (!roomId || !username) {
      return;
    }

    const provider = new SocketIOProvider(
      "http://localhost:3000",

      roomId,

      ydoc,

      {
        autoConnect: true,
      },
    );

    providerRef.current = provider;

    if (!yMeta.get("language")) {
      yMeta.set("language", "javascript");
    }

    const updateLanguage = () => {
      const sharedLanguage = yMeta.get("language");

      if (sharedLanguage) {
        setLanguage(sharedLanguage);
      }
    };

    updateLanguage();

    yMeta.observe(updateLanguage);


    provider.awareness.setLocalStateField("user", {
      id: crypto.randomUUID(),

      username,
    });

    provider.awareness.setLocalStateField("typing", false);

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().entries());

      setUsers(
        states

          .filter(([_, state]) => state.user?.username)

          .map(([clientId, state]) => ({
            ...state.user,

            isCurrentUser: clientId === provider.awareness.clientID,

            typing: state.typing || false,
          })),
      );
    };

    updateUsers();

    provider.awareness.on("change", updateUsers);


    const handleBeforeUnload = () => {
      provider.awareness.setLocalStateField("user", null);

      provider.awareness.setLocalStateField("typing", false);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

  
    return () => {
      yMeta.unobserve(updateLanguage);

      provider.awareness.off("change", updateUsers);

      provider.awareness.setLocalStateField("user", null);

      provider.awareness.setLocalStateField("typing", false);

      provider.disconnect();

      window.removeEventListener("beforeunload", handleBeforeUnload);

      providerRef.current = null;
    };
  }, [roomId, username, ydoc, yMeta]);

  
  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
    };
  }, []);


  if (!roomId) {
    return (
      <main className="min-h-screen w-full bg-gray-950 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-5xl">
         
          <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3">
            Collaborative Code Editor
          </h1>

          <p className="text-gray-400 text-center mb-8 sm:mb-10">
            Code together in real time.
          </p>

          {error && (
            <div className="w-full max-w-2xl mx-auto mb-6 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200 text-center text-sm sm:text-base">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

            <div className="bg-gray-900 rounded-xl p-5 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Create Private Room
              </h2>

              <p className="text-gray-400 mb-5 sm:mb-6">
                Create a new room and invite others.
              </p>

              <form onSubmit={createRoom} className="flex flex-col gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 outline-none focus:border-amber-50"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 rounded-lg bg-amber-50 text-gray-950 font-bold hover:bg-amber-100 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Private Room"}
                </button>
              </form>
            </div>

            <div className="bg-gray-900 rounded-xl p-5 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Join Existing Room
              </h2>

              <p className="text-gray-400 mb-5 sm:mb-6">
                Enter a 6-digit Room ID.
              </p>

              <form onSubmit={joinRoom} className="flex flex-col gap-4">
                <input
                  type="text"
                  name="roomId"
                  placeholder="6-digit Room ID"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  }}
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 outline-none focus:border-amber-50"
                />

                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 outline-none focus:border-amber-50"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3 rounded-lg bg-gray-700 text-white font-bold hover:bg-gray-600 disabled:opacity-50"
                >
                  {loading ? "Joining..." : "Join Room"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const typingUsers = users.filter(
    (user) => !user.isCurrentUser && user.typing,
  );

  return (
    <main className="min-h-screen w-full bg-gray-950 p-2 sm:p-3 md:p-4 flex flex-col md:flex-row gap-2">

      <aside className="w-full md:w-1/4 h-auto md:h-[calc(100vh-2rem)] bg-slate-300 rounded-lg overflow-hidden">
   
        <div className="p-3 sm:p-4 border-b border-gray-400">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-950">Users</h2>
        </div>


        <div className="p-3 sm:p-4">

          <div className="mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Room ID</p>

            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm sm:text-base">
                {roomId}
              </span>

              <button
                onClick={copyRoomId}
                className="bg-gray-800 text-white text-xs px-2 sm:px-3 py-1.5 rounded hover:bg-gray-700 whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-gray-600">You</p>

            <p className="font-bold text-gray-900 text-sm sm:text-base">
              {username}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              Online Users
            </p>

            <div className="flex flex-wrap gap-2 md:flex-col">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="px-2 sm:px-3 py-2 bg-gray-800 text-white rounded flex items-center gap-2 text-sm"
                >
                  <span className="h-2 w-2 bg-green-400 rounded-full shrink-0"></span>

                  <span className="break-all">{user.username}</span>
                </div>
              ))}
            </div>
          </div>


          {typingUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-700 italic">
              {typingUsers.length === 1
                ? `${typingUsers[0].username} is typing...`
                : `${typingUsers
                    .map((user) => user.username)
                    .join(", ")} are typing...`}
            </div>
          )}

  
          <div className="mt-4 md:mt-6">
            <button
              onClick={leaveRoom}
              className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm sm:text-base"
            >
              Leave Room
            </button>
          </div>
        </div>
      </aside>

      <section className="w-full md:w-3/4 h-[60vh] sm:h-[70vh] md:h-[calc(100vh-2rem)] rounded-lg overflow-hidden flex flex-col">
 
        <div className="bg-gray-800 p-2 sm:p-3 flex justify-end shrink-0">
          <select
            value={language}
            onChange={(e) => {
              const newLanguage = e.target.value;

              setLanguage(newLanguage);

              yMeta.set("language", newLanguage);
            }}
            className="bg-gray-700 text-white px-2 sm:px-3 py-2 rounded text-sm sm:text-base"
          >
            <option value="javascript">JavaScript</option>

            <option value="python">Python</option>

            <option value="java">Java</option>

            <option value="cpp">C++</option>
          </select>
        </div>

        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={language}
            defaultValue="// Start coding..."
            theme="vs-dark"
            onMount={handleMount}
            options={{
              minimap: {
                enabled: false,
              },

              fontSize: 14,

              automaticLayout: true,
            }}
          />
        </div>
      </section>
    </main>
  );
}

export default App;
