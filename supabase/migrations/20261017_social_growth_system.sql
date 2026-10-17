-- ==============================================================================
-- LIFEOS: SOCIAL CONNECTIONS, GROUPS, GROWTH HUB, COMPARISON & CHALLENGES SCHEMA
-- Migration: 20261017_social_growth_system.sql
-- Production-ready PostgreSQL schema with Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTEND PROFILES TABLE WITH USERNAME, BIO, GROWTH_GOAL, PRIVACY_SETTINGS
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS growth_goal TEXT,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
    "profile_visibility": "public",
    "share_habits": true,
    "share_goals": true,
    "share_tasks": false,
    "share_schedule": false,
    "allow_compare": true
  }'::jsonb;

-- Create index on username and display_name for fast user search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Update public.profiles RLS policies:
-- Allow authenticated users to view profiles that are public OR belonging to their accepted connections
DROP POLICY IF EXISTS "Users can view public or connected profiles" ON public.profiles;
CREATE POLICY "Users can view public or connected profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (privacy_settings->>'profile_visibility') = 'public'
    OR EXISTS (
      SELECT 1 FROM public.connections
      WHERE status = 'accepted'
        AND ((requester_id = auth.uid() AND addressee_id = profiles.id)
          OR (addressee_id = auth.uid() AND requester_id = profiles.id))
    )
  );

-- 2. CONNECTIONS TABLE (FRIENDS, COMPANIONS, TEAMMATES)
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, cancelled, blocked
  relationship_type TEXT NOT NULL DEFAULT 'friend', -- friend, companion (người yêu / đồng hành), teammate
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_different_users CHECK (requester_id <> addressee_id),
  CONSTRAINT uq_connection_pair UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON public.connections FOR SELECT
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE POLICY "Users can send connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connection status"
  ON public.connections FOR UPDATE
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE POLICY "Users can delete connection"
  ON public.connections FOR DELETE
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee ON public.connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);

CREATE OR REPLACE TRIGGER on_connection_updated
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  category TEXT DEFAULT 'growth', -- growth, study, workout, challenge, work
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 4. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  status TEXT NOT NULL DEFAULT 'accepted', -- invited, accepted, rejected
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS for groups: Member or Owner can view
CREATE POLICY "Group members can view group"
  ON public.groups FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id AND user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Group owner can update group"
  ON public.groups FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Group owner can delete group"
  ON public.groups FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create group"
  ON public.groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- RLS for group members:
CREATE POLICY "Group members can view membership"
  ON public.group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.status = 'accepted'
    )
  );

CREATE POLICY "Owners and admins can add or invite group members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members or admins can update membership"
  ON public.group_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can leave or admins remove members"
  ON public.group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
  );

-- 5. SHARE PERMISSIONS TABLE (GRANULAR ACCESS CONTROL)
CREATE TABLE IF NOT EXISTS public.share_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- goals, habits, tasks, schedule, specific_goal, specific_habit
  entity_id UUID, -- NULL means all entities of that type
  target_type TEXT NOT NULL, -- public, all_friends, specific_user, group
  target_id UUID, -- user_id or group_id
  permission_level TEXT NOT NULL DEFAULT 'view', -- view, cheer
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.share_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage share permissions"
  ON public.share_permissions FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Recipients can view granted permissions"
  ON public.share_permissions FOR SELECT
  USING (
    auth.uid() = owner_id
    OR target_type = 'public'
    OR (target_type = 'specific_user' AND target_id = auth.uid())
    OR (target_type = 'all_friends' AND EXISTS (
      SELECT 1 FROM public.connections
      WHERE status = 'accepted'
        AND ((requester_id = share_permissions.owner_id AND addressee_id = auth.uid())
          OR (addressee_id = share_permissions.owner_id AND requester_id = auth.uid()))
    ))
    OR (target_type = 'group' AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = share_permissions.target_id AND user_id = auth.uid() AND status = 'accepted'
    ))
  );

-- 6. CHALLENGES TABLE (COMPETITION & SHARED DISCIPLINE)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'habit', -- habit, task, reading, workout, study
  target_metric TEXT NOT NULL, -- days_streak, tasks_completed, study_hours
  target_value NUMERIC NOT NULL DEFAULT 7,
  unit TEXT DEFAULT 'ngày',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'pair', -- personal, pair, group
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  rules_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- 7. CHALLENGE PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined', -- invited, joined, declined, completed
  current_progress NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenge participants can view challenge"
  ON public.challenges FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenges.id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can manage challenge"
  ON public.challenges FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Participants can view challenge participants"
  ON public.challenge_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.challenge_id = challenge_participants.challenge_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_participants.challenge_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can join or update their participation"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_participants.challenge_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update their own progress"
  ON public.challenge_participants FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_participants.challenge_id AND c.creator_id = auth.uid()
    )
  );

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- connection_request, connection_accepted, group_invite, challenge_invite, cheer_sent, system
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (sender_id = auth.uid() OR auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- 9. SOCIAL CHEERS (KUDOS & MOTIVATION)
CREATE TABLE IF NOT EXISTS public.social_cheers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT DEFAULT 'general', -- general, goal, habit, challenge, weekly_review
  entity_id UUID,
  emoji TEXT DEFAULT '🔥',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.social_cheers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cheers they sent or received"
  ON public.social_cheers FOR SELECT
  USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can send cheers"
  ON public.social_cheers FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_cheers_recipient ON public.social_cheers(recipient_id);

-- 10. ROW LEVEL SECURITY UPDATES FOR SHARING (GOALS & HABITS)
-- Allow friends/groups with permission to view shared goals
DROP POLICY IF EXISTS "Users can view permitted shared goals" ON public.goals;
CREATE POLICY "Users can view permitted shared goals"
  ON public.goals FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.share_permissions sp
      WHERE sp.owner_id = goals.user_id
        AND sp.is_active = TRUE
        AND (sp.entity_type = 'goals' OR (sp.entity_type = 'specific_goal' AND sp.entity_id = goals.id))
        AND (
          sp.target_type = 'public'
          OR (sp.target_type = 'specific_user' AND sp.target_id = auth.uid())
          OR (sp.target_type = 'all_friends' AND EXISTS (
            SELECT 1 FROM public.connections c
            WHERE c.status = 'accepted'
              AND ((c.requester_id = goals.user_id AND c.addressee_id = auth.uid())
                OR (c.addressee_id = goals.user_id AND c.requester_id = auth.uid()))
          ))
        )
    )
  );

-- Allow friends/groups with permission to view shared habits
DROP POLICY IF EXISTS "Users can view permitted shared habits" ON public.habits;
CREATE POLICY "Users can view permitted shared habits"
  ON public.habits FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.share_permissions sp
      WHERE sp.owner_id = habits.user_id
        AND sp.is_active = TRUE
        AND (sp.entity_type = 'habits' OR (sp.entity_type = 'specific_habit' AND sp.entity_id = habits.id))
        AND (
          sp.target_type = 'public'
          OR (sp.target_type = 'specific_user' AND sp.target_id = auth.uid())
          OR (sp.target_type = 'all_friends' AND EXISTS (
            SELECT 1 FROM public.connections c
            WHERE c.status = 'accepted'
              AND ((c.requester_id = habits.user_id AND c.addressee_id = auth.uid())
                OR (c.addressee_id = habits.user_id AND c.requester_id = auth.uid()))
          ))
        )
    )
  );
