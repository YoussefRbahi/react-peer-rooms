import { useState, useEffect, useCallback, useRef } from "react";
import { DataConnection, Peer } from "peerjs";
import { PeerData, PeerEvent, Nicknames } from "../types";

export default function usePeerHost() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [id, setId] = useState<string>("");
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [nicknames, setNicknames] = useState<Nicknames>({});
  const [eventLog, setEventLog] = useState<PeerEvent[]>([]);
  const [room, setRoom] = useState<string>("");
  const receiveHandlerRef = useRef<
    ((nickname: string, value: any) => void) | null
  >(null);

  const nicknamesRef = useRef(nicknames);
  nicknamesRef.current = nicknames;
  const isReady = id !== "";

  // Initialize Peer
  useEffect(() => {
    const newPeer = new Peer();
    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  // Set up peer event listeners
  useEffect(() => {
    if (!peer) return;

    const handleOpen = (id: string) => {
      console.log("My peer ID is: " + id);
      setId(id);
    };

    const handleDisconnected = () => {
      console.log("Peer disconnected");
      console.log("Trying to reconnect...");
      peer.reconnect();

      const timeoutId = setTimeout(() => {
        if (peer.disconnected) {
          console.log("Reconnection failed");
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    };

    const handleError = (err: Error) => {
      console.error("Peer error:", err);
      setId("");
    };

    peer.on("open", handleOpen);
    peer.on("disconnected", handleDisconnected);
    peer.on("error", handleError);

    return () => {
      peer.off("open", handleOpen);
      peer.off("disconnected", handleDisconnected);
      peer.off("error", handleError);
    };
  }, [peer]);

  const addEvent = useCallback(
    (peerId: string, type: string, nickname?: string, value?: string) => {
      setEventLog((prev) => [
        ...prev,
        { peerId, value, type, nickname, timestamp: Date.now() },
      ]);
    },
    []
  );

  const authenticate = useCallback(
    (conn: DataConnection, nickname: string | null) => {
      if (nickname !== null) {
        console.log(
          conn.peer,
          " connected and requested the nickname:",
          nickname
        );

        const isNicknameAvailable = !Object.values(
          nicknamesRef.current
        ).includes(nickname);

        if (isNicknameAvailable) {
          if (nicknamesRef.current[conn.peer] === undefined) {
            setNicknames((prev) => ({ ...prev, [conn.peer]: nickname }));
            conn.send({ type: "nickname", value: nickname });
            addEvent(conn.peer, "join", nickname);
          } else if (nicknamesRef.current[conn.peer] !== nickname) {
            conn.send({ type: "nickname", value: nickname });
            addEvent(conn.peer, "nickname", nickname);
            setNicknames((prev) => ({ ...prev, [conn.peer]: nickname }));
          }
        } else {
          conn.send({
            type: "nicknameUnavailable", // TODO: Modify this
            value: nickname,
          });
        }
      } else {
        const randomName = "User" + Math.floor(Math.random() * 1000);
        console.log(
          "Received null nickname from",
          conn.peer,
          ". Assigning random name:",
          randomName
        );
        conn.send({ type: "nickname", value: randomName });
        addEvent(conn.peer, "join", randomName);
        setNicknames((prev) => ({ ...prev, [conn.peer]: randomName }));
      }
    },
    [addEvent]
  );

  // Broadcast a message to all clients
  const broadcast = useCallback(
    (data: PeerData) => {
      connections.forEach((conn) => {
        conn.send(data);
      });
    },
    [connections]
  );

  // Handle incoming connections
  useEffect(() => {
    if (!peer) return;

    const handleConnection = (conn: DataConnection) => {
      conn.on("open", () => {
        console.log(conn.peer, "connected");
        setConnections((prev) => [...prev, conn]);
      });

      conn.on("data", (data: any) => {
        if (data.type === "join") {
          authenticate(conn, data.value);
        } else if (data.type === "data") {
          if (receiveHandlerRef.current) {
            if (nicknamesRef.current[conn.peer] === undefined) {
              console.error(
                "Received data from unauthenticated peer:",
                conn.peer
              );
            } else {
              receiveHandlerRef.current(
                nicknamesRef.current[conn.peer],
                data.value
              );
            }
          }
        } else {
          console.log("Received unknown data type:", data);
        }
      });

      conn.on("close", () => {
        console.log(conn.peer, "disconnected");
        setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));

        if (nicknamesRef.current[conn.peer] !== undefined) {
          addEvent(conn.peer, "leave", nicknamesRef.current[conn.peer]);
          setNicknames((prev) => {
            const newNicknames = { ...prev };
            delete newNicknames[conn.peer];
            return newNicknames;
          });
        }
      });

      conn.on("error", (err: Error) => {
        console.error("Connection error:", err);
      });
    };

    peer.on("connection", handleConnection);

    return () => {
      peer.off("connection", handleConnection);
    };
  }, [peer, authenticate, addEvent]);

  // Broadcast room name to all clients
  useEffect(() => {
    if (connections.length > 0) {
      broadcast({ type: "room", value: room });
    }
  }, [connections, room, broadcast]);

  const send = useCallback(
    (nickname: string, data: PeerData) => {
      // Find connection with nickname
      const conn = connections.find((c) => nicknames[c.peer] === nickname);
      if (conn) {
        conn.send(data);
      } else {
        console.error("No connection found for nickname:", nickname);
      }
    },
    [connections, nicknames]
  );

  const onReceive = useCallback(
    (handler: (nickname: string, value: any) => void) => {
      receiveHandlerRef.current = handler;
    },
    []
  );

  const clearLog = useCallback(() => {
    setEventLog([]);
  }, []);
  return {
    id,
    isReady,
    nicknames,
    eventLog,
    clearLog,
    send,
    onReceive,
    broadcast,
    room,
    setRoom,
  };
}
