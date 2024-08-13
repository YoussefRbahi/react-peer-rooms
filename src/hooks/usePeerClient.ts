import { useState, useEffect, useCallback, useRef } from "react";
import { DataConnection, Peer } from "peerjs";
import { PeerData } from "../types";

export default function usePeerClient(hostId: string) {
  // State declarations
  const [peer, setPeer] = useState<Peer | null>(null);
  const [id, setId] = useState<string>("");
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [room, setRoom] = useState<string>("");
  const receiveHandlerRef = useRef<((value: any) => void) | null>(null);

  const isConnected = connection !== null;

  // Initialize Peer on component mount
  useEffect(() => {
    const newPeer = new Peer();
    setPeer(newPeer);

    // Cleanup function to destroy peer when component unmounts
    return () => {
      newPeer.destroy();
    };
  }, []);

  // Function to connect to host
  const connectToHost = useCallback(
    (hostPeerId: string) => {
      if (!peer) {
        console.error("Peer not initialized");
        return;
      }

      const conn = peer.connect(hostPeerId);

      // Set a timeout to handle connection attempts that take too long
      const timeoutId = setTimeout(() => {
        console.log("Connection attempt timed out");
        setIsTimedOut(true);
        setIsConnecting(false);
        conn.close();
      }, 5000);

      conn.on("open", () => {
        clearTimeout(timeoutId); // Clear the timeout
        setConnection(conn);
        console.log("Connected to host");
        setIsConnecting(false);
      });

      conn.on("data", (data: unknown) => {
        console.log("Received:", data);

        // Type assertion
        const peerData = data as PeerData;
        switch (peerData.type) {
          case "nickname":
            setNickname(peerData.value);
            break;
          case "nicknameUnavailable":
            alert(`The nickname "${peerData.value}" is not available`);
            break;
          case "room":
            setRoom(peerData.value);
            break;
          case "data":
            if (receiveHandlerRef.current) {
              receiveHandlerRef.current(peerData.value);
            }
          default:
            console.log("Received unknown data type:", peerData);
        }
      });

      conn.on("close", () => {
        setConnection(null);
        console.log("Disconnected from host");
      });

      conn.on("error", (err: Error) => {
        clearTimeout(timeoutId); // Clear the timeout
        console.error("Connection error:", err);
        setConnection(null);
        setIsConnecting(false);
      });
    },
    [peer]
  );

  // Set up peer event listeners
  useEffect(() => {
    if (!peer) return;

    const handleOpen = (id: string) => {
      console.log("My peer ID is: " + id);
      setId(id);
      if (hostId !== "" && hostId !== id) {
        connectToHost(hostId as string);
      }
    };

    const handleDisconnected = () => {
      console.log("Peer disconnected");
      console.log("Trying to reconnect...");
      peer.reconnect();

      // Set a timeout to check if reconnection was successful
      const timeoutId = setTimeout(() => {
        if (peer.disconnected) {
          console.log("Reconnection failed");
          // TODO: Implement a more sophisticated retry mechanism here
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

    // Cleanup function to remove event listeners
    return () => {
      peer.off("open", handleOpen);
      peer.off("disconnected", handleDisconnected);
      peer.off("error", handleError);
    };
  }, [peer, hostId, connectToHost]);

  // Function to join the host and set or request a random nickname
  const joinRoom = useCallback(
    (nickname: string | null) => {
      if (!connection) {
        console.error("Not connected to a host");
        return;
      }

      connection.send({ type: "join", value: nickname });
    },
    [connection]
  );

  // Function to set or update nickname
  const updateNickname = useCallback(
    (newNickname: string) => {
      if (!connection) {
        console.error("Not connected to a host");
        return;
      }

      connection.send({ type: "nickname", value: newNickname });
    },
    [connection]
  );

  // Function to send custom data
  const send = useCallback(
    (data: { type: string; content: any }) => {
      if (!connection) {
        console.error("Not connected to a host");
        return;
      }

      connection.send({ type: "data", value: data });
    },
    [connection]
  );

  const onReceive = useCallback((handler: (value: any) => void) => {
    receiveHandlerRef.current = handler;
  }, []);

  return {
    id,
    joinRoom,
    send,
    onReceive,
    updateNickname,
    isConnecting,
    isConnected,
    isTimedOut,
    nickname,
    room,
  };
}
