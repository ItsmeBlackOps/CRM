import { joinRooms } from '../src/lib/rooms.js';

describe('joinRooms', () => {
  it('joins all relevant rooms', () => {
    const socket: any = { join: jest.fn() };
    const io: any = {};
    joinRooms(io, socket, {
      id: 'u1',
      role: 'marketingManager',
      branchId: 'b1',
      departmentId: 'd1',
      teamId: 't1',
      teamLeadId: 'l1',
    });
    expect(socket.join).toHaveBeenCalledWith('user:u1');
    expect(socket.join).toHaveBeenCalledWith('branch:b1');
    expect(socket.join).toHaveBeenCalledWith('department:d1');
    expect(socket.join).toHaveBeenCalledWith('team:t1');
    expect(socket.join).toHaveBeenCalledWith('lead:l1');
    expect(socket.join).toHaveBeenCalledWith('role:marketingManager');
  });

  it('joins minimal rooms', () => {
    const socket: any = { join: jest.fn() };
    const io: any = {};
    joinRooms(io, socket, { id: 'u2' });
    expect(socket.join).toHaveBeenCalledWith('user:u2');
    expect(socket.join).toHaveBeenCalledTimes(1);
  });
});
