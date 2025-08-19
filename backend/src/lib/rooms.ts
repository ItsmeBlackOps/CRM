import { Server, Socket } from 'socket.io';

interface UserInfo {
  id: string;
  role?: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  teamLeadId?: string;
}

export function joinRooms(_io: Server, socket: Socket, user: UserInfo) {
  socket.join(`user:${user.id}`);
  if (user.branchId) socket.join(`branch:${user.branchId}`);
  if (user.departmentId) socket.join(`department:${user.departmentId}`);
  if (user.teamId) socket.join(`team:${user.teamId}`);
  if (user.teamLeadId) socket.join(`lead:${user.teamLeadId}`);
  if (user.role) socket.join(`role:${user.role}`);
}
