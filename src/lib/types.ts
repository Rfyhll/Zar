export interface SessionUser {
  id: string
  username: string
  name: string
  email: string | null
  role: string
  provider: string
  faceRegistered: boolean
  avatarUrl: string | null
  bio: string | null
}

export interface FeedUser {
  id: string
  username: string
  name: string
  avatarUrl: string | null
  role: string
}

export interface FeedComment {
  id: string
  text: string
  createdAt: string
  user: FeedUser
}

export interface FeedPost {
  id: string
  imageUrl: string
  caption: string
  createdAt: string
  user: FeedUser
  likeCount: number
  likedByMe: boolean
  comments: FeedComment[]
}

export interface Tutorial {
  slug: string
  title: string
  category: string
  difficulty: string
  duration: string
  views: string
  description: string
  materials: string[]
  youtubeId: string
}

export interface AdminUser {
  id: string
  username: string
  name: string
  email: string | null
  role: string
  provider: string
  faceRegistered: boolean
  avatarUrl: string | null
  bio: string | null
  postCount: number
  likeCount: number
  commentCount: number
  activeSessions: number
  createdAt: string
  lastSeenAt: string
}

export interface AdminActivity {
  id: string
  action: string
  actionLabel: string
  detail: string | null
  path: string | null
  createdAt: string
  actorName: string | null
  actorUsername: string | null
}

export interface AdminOverview {
  stats: {
    totalUsers: number
    totalAdmins: number
    onlineUsers: number
    totalPosts: number
    totalLikes: number
    totalComments: number
    activities24h: number
    faceRegistered: number
    googleUsers: number
  }
  users: AdminUser[]
  activities: AdminActivity[]
}
