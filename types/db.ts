// This file is auto-generated. Do not edit it manually.

export type post_status =
  'draft' |
  'published' |
  'archived';

export type user_role =
  'admin' |
  'user' |
  'guest';

export interface posts {
  /**
   * @default nextval('posts_id_seq'::regclass)
   */
  id: number;

  /**
   * @default null
   */
  user_id: number | null;

  /**
   * @default null
   */
  title: string;

  /**
   * @default null
   */
  content: string | null;

  /**
   * @default 'draft'::post_status
   */
  status: post_status;

  /**
   * Array of post tags
   * @default null
   */
  tags: string[] | null;

  /**
   * Number of times the post has been viewed
   * @default 0
   */
  view_count: number | null;

  /**
   * @default null
   */
  published_at: Date | null;

  /**
   * @default CURRENT_TIMESTAMP
   */
  created_at: Date | null;

  /**
   * @default CURRENT_TIMESTAMP
   */
  updated_at: Date | null;
}

export interface users {
  /**
   * @default nextval('users_id_seq'::regclass)
   */
  id: number;

  /**
   * @default null
   */
  name: string;

  /**
   * User email address
   * @default null
   */
  email: string;

  /**
   * @default 'user'::user_role
   */
  role: user_role;

  /**
   * Additional user metadata stored as JSON
   * @default null
   */
  metadata: unknown | null;

  /**
   * @default CURRENT_TIMESTAMP
   */
  created_at: Date | null;

  /**
   * @default CURRENT_TIMESTAMP
   */
  updated_at: Date | null;
}

declare module 'knex/types/tables' {
  interface Tables {
    posts: posts;
    users: users;
  }
}
