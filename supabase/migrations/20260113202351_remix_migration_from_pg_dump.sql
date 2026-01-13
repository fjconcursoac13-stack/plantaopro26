CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'master'
);


--
-- Name: calculate_bh_balance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_bh_balance(p_agent_id uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  total_balance NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN operation_type = 'credit' THEN hours
      WHEN operation_type = 'debit' THEN -hours
      ELSE 0
    END
  ), 0) INTO total_balance
  FROM public.overtime_bank
  WHERE agent_id = p_agent_id;
  
  RETURN total_balance;
END;
$$;


--
-- Name: calculate_bh_value(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_bh_value(p_agent_id uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  balance NUMERIC;
  hourly_rate NUMERIC;
BEGIN
  SELECT calculate_bh_balance(p_agent_id) INTO balance;
  SELECT COALESCE(bh_hourly_rate, 15.75) INTO hourly_rate FROM public.agents WHERE id = p_agent_id;
  
  RETURN balance * hourly_rate;
END;
$$;


--
-- Name: check_rate_limit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_identifier text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND attempt_time > (now() - (p_window_minutes || ' minutes')::INTERVAL);
  
  RETURN attempt_count < p_max_attempts;
END;
$$;


--
-- Name: create_shift_reminder(uuid, date, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_shift_reminder(p_agent_id uuid, p_shift_date date, p_shift_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  agent_name TEXT;
BEGIN
  SELECT name INTO agent_name FROM public.agents WHERE id = p_agent_id;
  
  INSERT INTO public.shift_alerts (
    agent_id, 
    shift_id,
    alert_type, 
    title, 
    message, 
    scheduled_for
  ) VALUES (
    p_agent_id,
    p_shift_id,
    'shift_reminder_24h',
    'Lembrete de Plantão',
    'Seu plantão está programado para amanhã (' || to_char(p_shift_date, 'DD/MM/YYYY') || '). Prepare-se!',
    (p_shift_date - INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
  );
END;
$$;


--
-- Name: generate_agent_shifts(uuid, date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_agent_shifts(p_agent_id uuid, p_first_shift_date date, p_months_ahead integer DEFAULT 6) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_date DATE;
  v_end_date DATE;
  v_count INTEGER := 0;
BEGIN
  -- Delete existing future shifts for this agent
  DELETE FROM public.agent_shifts 
  WHERE agent_id = p_agent_id 
  AND shift_date >= CURRENT_DATE;
  
  -- Set the end date based on months ahead
  v_end_date := p_first_shift_date + (p_months_ahead * INTERVAL '1 month');
  v_current_date := p_first_shift_date;
  
  -- Generate shifts in 4-day cycle (1 day on, 3 days off)
  WHILE v_current_date <= v_end_date LOOP
    INSERT INTO public.agent_shifts (agent_id, shift_date, start_time, end_time, shift_type, status)
    VALUES (p_agent_id, v_current_date, '07:00', '07:00', 'regular', 'scheduled')
    ON CONFLICT (agent_id, shift_date) DO NOTHING;
    
    v_count := v_count + 1;
    v_current_date := v_current_date + INTERVAL '4 days'; -- 24h shift + 72h rest = 4 days cycle
  END LOOP;
  
  -- Update agent's first_shift_date
  UPDATE public.agents SET first_shift_date = p_first_shift_date WHERE id = p_agent_id;
  
  RETURN v_count;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin_or_master(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_master(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'master')
  )
$$;


--
-- Name: record_login_attempt(text, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_login_attempt(p_identifier text, p_success boolean, p_ip text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.login_attempts (identifier, success, ip_address)
  VALUES (p_identifier, p_success, p_ip);
  
  -- Clean old attempts (older than 24h)
  DELETE FROM public.login_attempts WHERE attempt_time < (now() - INTERVAL '24 hours');
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: verify_master_admin(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_master_admin(p_username text, p_password text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash
    INTO stored_hash
  FROM public.master_admin
  WHERE lower(username) = lower(trim(p_username));

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Use pgcrypto's crypt() from the extensions schema
  RETURN stored_hash = extensions.crypt(p_password, stored_hash);
END;
$$;


SET default_table_access_method = heap;

--
-- Name: agent_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    event_date date NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    event_type character varying(30) DEFAULT 'note'::character varying NOT NULL,
    color character varying(20) DEFAULT 'amber'::character varying,
    is_all_day boolean DEFAULT true,
    start_time time without time zone,
    end_time time without time zone,
    reminder_before integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_leaves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_leaves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_leaves_leave_type_check CHECK ((leave_type = ANY (ARRAY['vacation'::text, 'medical'::text, 'special'::text, 'training'::text]))),
    CONSTRAINT agent_leaves_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT valid_date_range CHECK ((end_date >= start_date))
);


--
-- Name: agent_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    shift_date date NOT NULL,
    start_time time without time zone DEFAULT '07:00:00'::time without time zone NOT NULL,
    end_time time without time zone DEFAULT '07:00:00'::time without time zone NOT NULL,
    shift_type character varying(20) DEFAULT 'regular'::character varying NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    notes text,
    compensation_date date,
    is_vacation boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    "position" text,
    department text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    unit_id uuid,
    team text,
    cpf text,
    matricula text,
    birth_date date,
    age integer,
    address text,
    first_shift_date date,
    blood_type text,
    role text DEFAULT 'agent'::text,
    avatar_url text,
    bh_hourly_rate numeric(10,2) DEFAULT 15.75,
    bh_limit numeric(10,2) DEFAULT 70,
    license_status text DEFAULT 'active'::text,
    license_expires_at timestamp with time zone,
    license_notes text,
    CONSTRAINT agents_team_check CHECK ((team = ANY (ARRAY['ALFA'::text, 'BRAVO'::text, 'CHARLIE'::text, 'DELTA'::text])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_room_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_room_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'team'::text NOT NULL,
    unit_id uuid,
    team text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deleted_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    attempt_time timestamp with time zone DEFAULT now() NOT NULL,
    success boolean DEFAULT false,
    ip_address text
);


--
-- Name: master_admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_admin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: master_session_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_session_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: overtime_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.overtime_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    hours numeric(10,2) DEFAULT 0 NOT NULL,
    description text,
    operation_type text DEFAULT 'credit'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shift_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    shift_id uuid,
    alert_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shift_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['shift_reminder_24h'::text, 'shift_reminder_12h'::text, 'leave_approved'::text, 'leave_rejected'::text, 'swap_request'::text, 'swap_approved'::text])))
);


--
-- Name: shift_planner_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_planner_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    config_name text NOT NULL,
    config_type text NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    agent_count integer DEFAULT 4 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    shift_type text DEFAULT 'regular'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transfer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfer_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    from_unit_id uuid NOT NULL,
    to_unit_id uuid NOT NULL,
    from_team text NOT NULL,
    to_team text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by text,
    CONSTRAINT transfer_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    municipality text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    director_name text,
    coordinator_name text,
    address text,
    email text,
    phone text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_events agent_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_events
    ADD CONSTRAINT agent_events_pkey PRIMARY KEY (id);


--
-- Name: agent_leaves agent_leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_leaves
    ADD CONSTRAINT agent_leaves_pkey PRIMARY KEY (id);


--
-- Name: agent_shifts agent_shifts_agent_id_shift_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_shifts
    ADD CONSTRAINT agent_shifts_agent_id_shift_date_key UNIQUE (agent_id, shift_date);


--
-- Name: agent_shifts agent_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_shifts
    ADD CONSTRAINT agent_shifts_pkey PRIMARY KEY (id);


--
-- Name: agents agents_cpf_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_cpf_unique UNIQUE (cpf);


--
-- Name: agents agents_matricula_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_matricula_unique UNIQUE (matricula);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_room_members chat_room_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_pkey PRIMARY KEY (id);


--
-- Name: chat_room_members chat_room_members_room_id_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_room_id_agent_id_key UNIQUE (room_id, agent_id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: deleted_messages deleted_messages_message_id_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_messages
    ADD CONSTRAINT deleted_messages_message_id_agent_id_key UNIQUE (message_id, agent_id);


--
-- Name: deleted_messages deleted_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_messages
    ADD CONSTRAINT deleted_messages_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: master_admin master_admin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_admin
    ADD CONSTRAINT master_admin_pkey PRIMARY KEY (id);


--
-- Name: master_admin master_admin_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_admin
    ADD CONSTRAINT master_admin_username_key UNIQUE (username);


--
-- Name: master_session_tokens master_session_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_session_tokens
    ADD CONSTRAINT master_session_tokens_pkey PRIMARY KEY (id);


--
-- Name: master_session_tokens master_session_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_session_tokens
    ADD CONSTRAINT master_session_tokens_token_key UNIQUE (token);


--
-- Name: overtime_bank overtime_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_bank
    ADD CONSTRAINT overtime_bank_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: shift_alerts shift_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_alerts
    ADD CONSTRAINT shift_alerts_pkey PRIMARY KEY (id);


--
-- Name: shift_planner_configs shift_planner_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_planner_configs
    ADD CONSTRAINT shift_planner_configs_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: transfer_requests transfer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_agent_events_agent_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_events_agent_date ON public.agent_events USING btree (agent_id, event_date);


--
-- Name: idx_agent_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_events_type ON public.agent_events USING btree (event_type);


--
-- Name: idx_agent_shifts_agent_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_shifts_agent_date ON public.agent_shifts USING btree (agent_id, shift_date);


--
-- Name: idx_agent_shifts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_shifts_status ON public.agent_shifts USING btree (status);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);


--
-- Name: idx_chat_messages_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_room_id ON public.chat_messages USING btree (room_id);


--
-- Name: idx_chat_room_members_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_room_members_agent_id ON public.chat_room_members USING btree (agent_id);


--
-- Name: idx_chat_room_members_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_room_members_room_id ON public.chat_room_members USING btree (room_id);


--
-- Name: idx_shift_planner_configs_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_planner_configs_agent_id ON public.shift_planner_configs USING btree (agent_id);


--
-- Name: agent_leaves update_agent_leaves_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_leaves_updated_at BEFORE UPDATE ON public.agent_leaves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shifts update_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transfer_requests update_transfer_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transfer_requests_updated_at BEFORE UPDATE ON public.transfer_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_events agent_events_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_events
    ADD CONSTRAINT agent_events_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_leaves agent_leaves_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_leaves
    ADD CONSTRAINT agent_leaves_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_shifts agent_shifts_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_shifts
    ADD CONSTRAINT agent_shifts_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agents agents_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: chat_messages chat_messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: chat_room_members chat_room_members_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: chat_room_members chat_room_members_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: deleted_messages deleted_messages_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_messages
    ADD CONSTRAINT deleted_messages_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: deleted_messages deleted_messages_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_messages
    ADD CONSTRAINT deleted_messages_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: master_session_tokens master_session_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_session_tokens
    ADD CONSTRAINT master_session_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: overtime_bank overtime_bank_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_bank
    ADD CONSTRAINT overtime_bank_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shift_alerts shift_alerts_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_alerts
    ADD CONSTRAINT shift_alerts_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: shift_planner_configs shift_planner_configs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_planner_configs
    ADD CONSTRAINT shift_planner_configs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: shifts shifts_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_from_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_from_unit_id_fkey FOREIGN KEY (from_unit_id) REFERENCES public.units(id);


--
-- Name: transfer_requests transfer_requests_to_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_to_unit_id_fkey FOREIGN KEY (to_unit_id) REFERENCES public.units(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: agents Admins can delete agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete agents" ON public.agents FOR DELETE USING (public.is_admin_or_master(auth.uid()));


--
-- Name: master_session_tokens Admins can delete session tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete session tokens" ON public.master_session_tokens FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));


--
-- Name: agent_shifts Admins can delete shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete shifts" ON public.agent_shifts FOR DELETE USING (public.is_admin_or_master(auth.uid()));


--
-- Name: agents Admins can insert agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert agents" ON public.agents FOR INSERT WITH CHECK (public.is_admin_or_master(auth.uid()));


--
-- Name: agents Admins can manage agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage agents" ON public.agents TO authenticated USING (public.is_admin_or_master(auth.uid()));


--
-- Name: overtime_bank Admins can manage overtime; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage overtime" ON public.overtime_bank TO authenticated USING (public.is_admin_or_master(auth.uid()));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'master'::public.app_role));


--
-- Name: shifts Admins can manage shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shifts" ON public.shifts TO authenticated USING (public.is_admin_or_master(auth.uid()));


--
-- Name: units Admins can manage units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage units" ON public.units TO authenticated USING (public.is_admin_or_master(auth.uid()));


--
-- Name: transfer_requests Admins can update transfer requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update transfer requests" ON public.transfer_requests FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'master'::public.app_role]))))));


--
-- Name: agent_leaves Agents can create their own leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can create their own leaves" ON public.agent_leaves FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: deleted_messages Agents can delete own deleted marks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can delete own deleted marks" ON public.deleted_messages FOR DELETE TO authenticated USING ((public.is_admin_or_master(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = deleted_messages.agent_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1)))))));


--
-- Name: overtime_bank Agents can delete their own overtime; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can delete their own overtime" ON public.overtime_bank FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = overtime_bank.agent_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1))))));


--
-- Name: agent_leaves Agents can delete their own pending leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can delete their own pending leaves" ON public.agent_leaves FOR DELETE USING (((auth.uid() IS NOT NULL) AND (status = 'pending'::text)));


--
-- Name: deleted_messages Agents can insert own deleted marks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can insert own deleted marks" ON public.deleted_messages FOR INSERT TO authenticated WITH CHECK ((public.is_admin_or_master(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = deleted_messages.agent_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1)))))));


--
-- Name: overtime_bank Agents can insert their own overtime; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can insert their own overtime" ON public.overtime_bank FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = overtime_bank.agent_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1))))));


--
-- Name: agents Agents can update own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can update own record" ON public.agents FOR UPDATE USING (((cpf = split_part(auth.email(), '@'::text, 1)) OR public.is_admin_or_master(auth.uid())));


--
-- Name: shift_alerts Agents can update their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can update their own alerts" ON public.shift_alerts FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: overtime_bank Agents can update their own overtime; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can update their own overtime" ON public.overtime_bank FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = overtime_bank.agent_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = overtime_bank.agent_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1))))));


--
-- Name: agent_leaves Agents can update their own pending leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can update their own pending leaves" ON public.agent_leaves FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (status = 'pending'::text)));


--
-- Name: deleted_messages Agents can view own deleted marks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can view own deleted marks" ON public.deleted_messages FOR SELECT TO authenticated USING ((public.is_admin_or_master(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = deleted_messages.agent_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1)))))));


--
-- Name: agents Agents can view own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can view own record" ON public.agents FOR SELECT USING (((cpf = split_part(auth.email(), '@'::text, 1)) OR public.is_admin_or_master(auth.uid())));


--
-- Name: shift_alerts Agents can view their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can view their own alerts" ON public.shift_alerts FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: agent_leaves Agents can view their own leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can view their own leaves" ON public.agent_leaves FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: overtime_bank Anyone can view overtime; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view overtime" ON public.overtime_bank FOR SELECT USING (true);


--
-- Name: profiles Anyone can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: user_roles Anyone can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);


--
-- Name: transfer_requests Anyone can view transfer requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view transfer requests" ON public.transfer_requests FOR SELECT USING (true);


--
-- Name: transfer_requests Authenticated users can create transfer requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create transfer requests" ON public.transfer_requests FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: shifts Authenticated users can view shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view shifts" ON public.shifts FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: units Authenticated users can view units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view units" ON public.units FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: master_admin No direct access to master_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct access to master_admin" ON public.master_admin FOR SELECT USING (false);


--
-- Name: master_session_tokens No direct insert for session tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert for session tokens" ON public.master_session_tokens FOR INSERT WITH CHECK (false);


--
-- Name: master_session_tokens No direct view for session tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct view for session tokens" ON public.master_session_tokens FOR SELECT USING (false);


--
-- Name: login_attempts No public access to login attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No public access to login attempts" ON public.login_attempts FOR SELECT TO authenticated USING (false);


--
-- Name: chat_messages Room members can insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Room members can insert messages" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = chat_messages.sender_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1))))));


--
-- Name: chat_messages Room members can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Room members can view messages" ON public.chat_messages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (public.chat_room_members crm
     JOIN public.agents a ON ((a.id = crm.agent_id)))
  WHERE ((crm.room_id = chat_messages.room_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1))))) OR public.is_admin_or_master(auth.uid())));


--
-- Name: shift_alerts System can create alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create alerts" ON public.shift_alerts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: chat_rooms Users can create chat rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: shift_planner_configs Users can create planner configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create planner configs" ON public.shift_planner_configs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: agents Users can create their own agent record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own agent record" ON public.agents FOR INSERT WITH CHECK (((cpf = split_part(auth.email(), '@'::text, 1)) OR (auth.uid() IS NOT NULL)));


--
-- Name: chat_messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = chat_messages.sender_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1))))));


--
-- Name: shift_planner_configs Users can delete planner configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete planner configs" ON public.shift_planner_configs FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: agent_events Users can delete their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own events" ON public.agent_events FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: agent_shifts Users can insert shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert shifts" ON public.agent_shifts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: agent_events Users can insert their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own events" ON public.agent_events FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: chat_room_members Users can join chat rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can join chat rooms" ON public.chat_room_members FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: chat_room_members Users can leave chat rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can leave chat rooms" ON public.chat_room_members FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: chat_messages Users can send chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send chat messages" ON public.chat_messages FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: chat_messages Users can update own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own messages" ON public.chat_messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.agents a
  WHERE ((a.id = chat_messages.sender_id) AND (a.cpf = split_part(auth.email(), '@'::text, 1))))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: shift_planner_configs Users can update planner configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update planner configs" ON public.shift_planner_configs FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: agent_shifts Users can update shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update shifts" ON public.agent_shifts FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: agents Users can update their own agent record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own agent record" ON public.agents FOR UPDATE TO authenticated USING ((cpf = split_part(auth.email(), '@'::text, 1))) WITH CHECK ((cpf = split_part(auth.email(), '@'::text, 1)));


--
-- Name: agent_events Users can update their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own events" ON public.agent_events FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: agent_shifts Users can view all shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all shifts" ON public.agent_shifts FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: chat_room_members Users can view chat room members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chat room members" ON public.chat_room_members FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: chat_rooms Users can view chat rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chat rooms" ON public.chat_rooms FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: shift_planner_configs Users can view planner configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view planner configs" ON public.shift_planner_configs FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: agent_events Users can view their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own events" ON public.agent_events FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: agent_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_leaves; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_leaves ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_room_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: deleted_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deleted_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: master_admin; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.master_admin ENABLE ROW LEVEL SECURITY;

--
-- Name: master_session_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.master_session_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: overtime_bank; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.overtime_bank ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_planner_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_planner_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: transfer_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;