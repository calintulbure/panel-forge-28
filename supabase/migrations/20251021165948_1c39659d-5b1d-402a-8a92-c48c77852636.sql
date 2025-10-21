-- Add approval status tracking for new users
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update the products SELECT policy to require admin or operator role
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;

CREATE POLICY "Only admins and operators can view products" 
ON public.products 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operator'::app_role)
);

-- Function to get user approval status
CREATE OR REPLACE FUNCTION public.get_user_approval_status(_user_id uuid)
RETURNS TABLE (
  has_role boolean,
  is_approved boolean,
  pending_approval boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id) as has_role,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND approved = true) as is_approved,
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND approved = false) as pending_approval
$$;

-- Function to create pending user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a pending operator role for new users (requires admin approval)
  INSERT INTO public.user_roles (user_id, role, approved)
  VALUES (new.id, 'operator'::app_role, false);
  RETURN new;
END;
$$;

-- Trigger to automatically create pending role on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_signup();

-- Update RLS policy on user_roles to allow users to see their own pending status
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles and approval status" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Policy for admins to approve users
CREATE POLICY "Admins can update user roles for approval" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));