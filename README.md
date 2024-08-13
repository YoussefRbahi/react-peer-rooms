# React Peer Rooms

React hooks for centralized yet serverless P2P communication. Create PeerJS-based rooms with simple host/client components.

## Installation

```bash
npm install react-peer-rooms
```

or

```bash
yarn add react-peer-rooms
```

## Peer Dependencies

This library has the following peer dependencies:

- react: ^18.0.0
- peerjs: ^1.5.4

These should be installed automatically by npm or yarn when you install react-peer-rooms.

## Usage

### Host Component

```typescript
import { useEffect } from 'react';
import { usePeerHost } from 'react-peer-rooms';

const HostComponent = () => {
const host = usePeerHost();

useEffect(() => {
if (host.isReady) {
setRoom('my-room-name');
console.log('Host ID:', id);
}
}, [host]);

useEffect(() => {
host.onReceive((nickname, data) => {
console.log(`Received from ${nickname}:`, data);
});
}, [host]);

return (
<div>
<h1>Host</h1>
<p>Status: {host.isReady ? 'Ready' : 'Initializing...'}</p>
<p>Host ID: {host.id}</p>
<h2>Connected Clients:</h2>
<ul>
{Object.entries(host.nicknames).map(([peerId, nickname]) => (
<li key={peerId}>{nickname}</li>
))}
</ul>
<h2>Event Log:</h2>
<ul>
{host.eventLog.map((event, index) => (
<li key={index}>{`${event.type}: ${event.nickname || event.peerId}`}</li>
))}
</ul>
</div>
);
};
```

### Client Component

```typescript
import { useEffect, useState } from 'react';
import { usePeerClient } from 'react-peer-rooms';

const ClientComponent = ({ hostId }) => {
const client = usePeerClient(hostId);
const [message, setMessage] = useState('');

useEffect(() => {
if (client.isConnected) {
client.joinRoom('MyNickname');
}
}, [client]);

useEffect(() => {
client.onReceive((data) => {
console.log('Received:', data);
});
}, [client]);

const handleSend = () => {
client.send({ type: 'chat', content: message });
setMessage('');
};

return (
<div>
<h1>Client</h1>
<p>Status: {client.isConnected ? 'Connected' : 'Connecting...'}</p>
<p>Client ID: {client.id}</p>
<p>Nickname: {client.nickname}</p>
<p>Room: {client.room}</p>
<input
type="text"
value={message}
onChange={(e) => setMessage(e.target.value)}
placeholder="Enter message"
/>
<button onClick={handleSend}>Send</button>
</div>
);
};
```

## API

### usePeerHost

Returns an object with the following properties and methods:

- id: string - The unique ID of the host peer
- isReady: boolean - Indicates if the host is ready to accept connections
- nicknames: object - A map of peer IDs to their nicknames
- eventLog: array - A log of events (joins, leaves, etc.)
- send: function(nickname: string, data: any) - Send data to a specific client
- onReceive: function(callback: (nickname: string, data: any) => void) - Set up a callback for receiving data
- broadcast: function(data: any) - Send data to all connected clients
- setRoom: function(roomName: string) - Set the room name

### usePeerClient

Returns an object with the following properties and methods:

- id: string - The unique ID of the client peer
- joinRoom: function(nickname: string | null) - Join the room with an optional nickname
- send: function(data: any) - Send data to the host
- onReceive: function(callback: (data: any) => void) - Set up a callback for receiving data
- isConnected: boolean - Indicates if the client is connected to the host
- nickname: string | null - The client's current nickname
- room: string - The current room name
- updateNickname: function(newNickname: string) - Update the client's nickname

## Examples

[IRLChat](https://github.com/YoussefRbahi/irl-chat): a chat app for live events and big screens that anyone can join by scanning a QR code. [Try now](https://irlchat.netlify.app)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
