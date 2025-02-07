import { Board, Task, User } from "./app/types/types";

// Dummy Users Data
export const users: User[] = [
  {
    id: "1",
    username: "johndoe",
    fullname: "John Doe",
    email: "johndoe@example.com",
    refreshToken: "refreshToken1",
    accessToken: "accessToken1",
    avatarUrl: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    roleName: "Admin"
  },
  {
    id: "2",
    username: "janedoe",
    fullname: "Jane Doe",
    email: "janedoe@example.com",
    refreshToken: "refreshToken2",
    accessToken: "accessToken2",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    roleName: "Super Admin"
  },
  {
    id: "3",
    username: "mike1985",
    fullname: "Mike Johnson",
    email: "mike1985@example.com",
    refreshToken: "refreshToken3",
    accessToken: "accessToken3",
    avatarUrl: "https://plus.unsplash.com/premium_photo-1689539137236-b68e436248de?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8cGVyc29uJTIwYXZhdGFyfGVufDB8fDB8fHww",
    roleName: "User"
  },
  {
    id: "4",
    username: "susan_smith",
    fullname: "Susan Smith",
    email: "susan_smith@example.com",
    refreshToken: "refreshToken4",
    accessToken: "accessToken4",
    avatarUrl: "https://images.unsplash.com/photo-1599566147214-ce487862ea4f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fHBlcnNvbiUyMGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D",
    roleName: "User"
  },
  {
    id: "5",
    username: "jake_perry",
    fullname: "Jake Perry",
    email: "jake_perry@example.com",
    refreshToken: "refreshToken5",
    accessToken: "accessToken5",
    avatarUrl: "https://plus.unsplash.com/premium_photo-1690407617542-2f210cf20d7e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fHBlcnNvbiUyMGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D",
    roleName: "Maintainer"
  },
  {
    id: "6",
    username: "lucy_lee",
    fullname: "Lucy Lee",
    email: "lucy_lee@example.com",
    refreshToken: "refreshToken6",
    accessToken: "accessToken6",
    avatarUrl: "https://example.com/avatar6.png",
    roleName: "User"
  },
  {
    id: "7",
    username: "charles_brown",
    fullname: "Charles Brown",
    email: "charles_brown@example.com",
    refreshToken: "refreshToken7",
    accessToken: "accessToken7",
    avatarUrl: "https://images.unsplash.com/photo-1701615004837-40d8573b6652?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHBlcnNvbiUyMGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D",
    roleName: "User"
  },
  {
    id: "8",
    username: "olivia_williams",
    fullname: "Olivia Williams",
    email: "olivia_williams@example.com",
    refreshToken: "refreshToken8",
    accessToken: "accessToken8",
    avatarUrl: "https://images.unsplash.com/photo-1724435811349-32d27f4d5806?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjd8fHBlcnNvbiUyMGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D",
    roleName: "User"
  },
  {
    id: "9",
    username: "alex_taylor",
    fullname: "Alex Taylor",
    email: "alex_taylor@example.com",
    refreshToken: "refreshToken9",
    accessToken: "accessToken9",
    avatarUrl: "https://plus.unsplash.com/premium_photo-1693258698597-1b2b1bf943cc?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjl8fHBlcnNvbiUyMGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D",
    roleName: "User"
  },
  {
    id: "10",
    username: "emma_davis",
    fullname: "Emma Davis",
    email: "emma_davis@example.com",
    refreshToken: "refreshToken10",
    accessToken: "accessToken10",
    avatarUrl: "https://plus.unsplash.com/premium_photo-1690086519096-0594592709d3?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDl8fHBlcnNvbiUyMGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D",
    roleName: "User"
  }
];

export const getUserById = (id: string): User => {
  const user = users.find(user => user.id === id);
  if (!user) {
    throw new Error(`User with id ${id} not found`);
  }
  return user;
};



// Dummy Board Data
export const boards: Board[] = [
  {
    id: "1",
    title: "Sprint 1",
    cover: "https://images.unsplash.com/photo-1586473219010-2ffc57b0d282?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    isStarred: false,
    visibility: "public",
    createdBy: getUserById('2'),
    createdAt: "2025-01-01 12:01:34",
    updatedBy: getUserById('2'),
    upatedAt: "2025-01-01 12:01:34"
  },
  {
    id: "2",
    title: "Sprint 2",
    cover: "https://images.unsplash.com/photo-1515847049296-a281d6401047?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    isStarred: false,
    visibility: "public",
    createdBy: getUserById('4'),
    createdAt: "2025-01-01 12:01:34",
    updatedBy: getUserById('4'),
    upatedAt: "2025-01-01 12:01:34"
  },
  {
    id: "3",
    title: "Sprint 3",
    cover: "https://images.unsplash.com/photo-1634078111133-a1e12d6131b6?q=80&w=2130&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    isStarred: true,
    visibility: "public",
    createdBy: getUserById('3'),
    createdAt: "2025-01-01 12:01:34",
    updatedBy: getUserById('3'),
    upatedAt: "2025-01-01 12:01:34"
  },
  {
    id: "4",
    title: "Sprint 4",
    cover: "https://images.unsplash.com/photo-1593505681742-8cbb6f44de25?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mzl8fHRhc2t8ZW58MHx8MHx8fDA%3D",
    isStarred: false,
    visibility: "shared",
    createdBy: getUserById('5'),
    createdAt: "2025-01-01 12:01:34",
    updatedBy: getUserById('5'),
    upatedAt: "2025-01-01 12:01:34"
  },
  {
    id: "5",
    title: "Sprint 5",
    cover: "https://images.unsplash.com/photo-1569098644584-210bcd375b59?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDB8fHRhc2t8ZW58MHx8MHx8fDA%3D",
    isStarred: false,
    visibility: "private",
    createdBy: getUserById('2'),
    createdAt: "2025-01-01 12:01:34",
    updatedBy: getUserById('2'),
    upatedAt: "2025-01-01 12:01:34"
  }
];

export const getBoard = (id: string): Board => {
  const board = boards.find(board => board.id === id);
  if (!board) {
    throw new Error(`Board with id ${id} not found`);
  }
  return board;
}



// Dummy Task Data
const tasks: Task[] = [
  {
    id: "1",
    title: "Task 1: Design Landing Page",
    description: "Create a beautiful landing page for the website.",
    dueDate: "2025-02-28",
    assignment: {
      assignee: getUserById('1'),
      assignedAt: "2025-01-20"
    },
    createdBy: getUserById('2'),
    createdAt: "2025-01-19",
    updatedAt: "2025-01-25",
    updatedBy: getUserById('2'),
    members: [
      getUserById('1'),
      getUserById('2')
    ],
    logs: {
      list: [
        {
          id: "1",
          createdBy: getUserById('2'),
          content: "Looks good, but we need more details on the content.",
          createdAt: "2025-01-22",
          type: 'comment'
        },
        {
          id: "2",
          createdBy: getUserById('3'),
          content: "Lorem ipsum dolor sit amet sih.",
          createdAt: "2025-01-21",
          type: 'comment'
        },
        {
          id: "2",
          createdBy: getUserById('1'),
          content: getUserById('3').id,
          createdAt: "2025-01-21",
          type: 'members-addition'
        },
        {
          id: "2",
          createdBy: getUserById('1'),
          content: getUserById('3').id,
          createdAt: "2025-01-21",
          type: 'card-created'
        }
      ],
      meta: {
        actualCount: 1,
        currentPage: 1,
        sizePerPage: 10
      }
    },
    customFields: {
      list: [
        {
          type: "input",
          key: "Cabang",
          value: "MGW"
        },
        {
          type: "input",
          key: "Deal Maker",
          value: "Hari Sucipto"
        },
        {
          type: "input",
          key: "Design Langsung",
          value: "Tidak"
        },
        {
          type: "input",
          key: "Produk",
          value: "HEMCA polo"
        },
        {
          type: "input",
          key: "Bahan",
          value: "Lacost pisque soft"
        },
        {
          type: "input",
          key: "Warna",
          value: "Misty Gelap"
        },
        {
          type: "input",
          key: "Desainer",
          value: "Ridwan"
        }
      ],
    }
  },
  {
    id: "2",
    title: "Task 2: Design Landing Page 2",
    description: "Create a beautiful landing page for the website 2.",
    dueDate: "2025-02-28",
    assignment: {
      assignee: getUserById('3'),
      assignedAt: "2025-01-20"
    },
    createdBy: getUserById('4'),
    createdAt: "2025-01-19",
    updatedAt: "2025-01-25",
    updatedBy: getUserById('4'),
    members: [
      getUserById('1'),
      getUserById('2')
    ],
    logs: {
      list: [
        {
          id: "c1",
          createdBy: getUserById('2'),
          content: "Looks good, but we need more details on the content.",
          createdAt: "2025-01-22",
          type: 'content'
        }
      ],
      meta: {
        actualCount: 1,
        currentPage: 1,
        sizePerPage: 10
      }
    },
    customFields: {
      list: [
        {
          type: "input",
          key: "Cabang",
          value: "MGW"
        },
        {
          type: "input",
          key: "Deal Maker",
          value: "Hari Sucipto"
        },
        {
          type: "input",
          key: "Design Langsung",
          value: "Tidak"
        },
        {
          type: "input",
          key: "Produk",
          value: "HEMCA polo"
        },
        {
          type: "input",
          key: "Bahan",
          value: "Lacost pisque soft"
        },
        {
          type: "input",
          key: "Warna",
          value: "Misty Gelap"
        },
        {
          type: "input",
          key: "Desainer",
          value: "Ridwan"
        }
      ],
    }
  },
  {
    id: "3",
    title: "Task 3: Design Landing Page 3",
    description: "Create a beautiful landing page for the website 2.",
    dueDate: "2025-02-28",
    assignment: {
      assignee: getUserById('3'),
      assignedAt: "2025-01-20"
    },
    createdBy: getUserById('4'),
    createdAt: "2025-01-19",
    updatedAt: "2025-01-25",
    updatedBy: getUserById('4'),
    members: [
      getUserById('1'),
      getUserById('2')
    ],
    logs: {
      list: [
        {
          id: "c1",
          createdBy: getUserById('2'),
          content: "Looks good, but we need more details on the content.",
          createdAt: "2025-01-22",
          type: 'comment'
        }
      ],
      meta: {
        actualCount: 1,
        currentPage: 1,
        sizePerPage: 10
      }
    },
    customFields: {
      list: [
        {
          type: "input",
          key: "Cabang",
          value: "MGW"
        },
        {
          type: "input",
          key: "Deal Maker",
          value: "Hari Sucipto"
        },
        {
          type: "input",
          key: "Design Langsung",
          value: "Tidak"
        },
        {
          type: "input",
          key: "Produk",
          value: "HEMCA polo"
        },
        {
          type: "input",
          key: "Bahan",
          value: "Lacost pisque soft"
        },
        {
          type: "input",
          key: "Warna",
          value: "Misty Gelap"
        },
        {
          type: "input",
          key: "Desainer",
          value: "Ridwan"
        }
      ],
    }
  },
];

export const getTaskById = (id: string): Task => {
  const task = tasks.find(task => task.id === id);
  if (!task) {
    throw new Error(`Task with id ${id} not found`);
  }
  return task;
}