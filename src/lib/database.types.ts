
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_profile_id": string | null,"actor_user_id": string | null,"id": number,"new_data": Json | null,"occurred_at": string,"old_data": Json | null,"record_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_profile_id"?: string | null,"actor_user_id"?: string | null,"id"?: never,"new_data"?: Json | null,"occurred_at"?: string,"old_data"?: Json | null,"record_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_profile_id"?: string | null,"actor_user_id"?: string | null,"id"?: never,"new_data"?: Json | null,"occurred_at"?: string,"old_data"?: Json | null,"record_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"department_id": string | null,"designation": string | null,"employee_code": string,"employment_status": Database["public"]['Enums']["employment_status"],"full_name": string,"id": string,"joining_date": string | null,"phone": string | null,"reporting_manager_id": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string,"user_id": string | null,"work_email": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id"?: string | null,"designation"?: string | null,"employee_code": string,"employment_status"?: Database["public"]['Enums']["employment_status"],"full_name": string,"id"?: string,"joining_date"?: string | null,"phone"?: string | null,"reporting_manager_id"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id"?: string | null,"work_email": string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string | null,"designation"?: string | null,"employee_code"?: string,"employment_status"?: Database["public"]['Enums']["employment_status"],"full_name"?: string,"id"?: string,"joining_date"?: string | null,"phone"?: string | null,"reporting_manager_id"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id"?: string | null,"work_email"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_reporting_manager_id_fkey"
      columns: ["reporting_manager_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_updates": {
                  Row: {
                    "author_id": string,"completed_quantity": number | null,"created_at": string,"from_status": Database["public"]['Enums']["task_status"] | null,"id": number,"kind": string,"note": string | null,"task_id": string,"to_status": Database["public"]['Enums']["task_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"completed_quantity"?: number | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["task_status"] | null,"id"?: never,"kind": string,"note"?: string | null,"task_id": string,"to_status"?: Database["public"]['Enums']["task_status"] | null
                  }
                  Update: {
                    "author_id"?: string,"completed_quantity"?: number | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["task_status"] | null,"id"?: never,"kind"?: string,"note"?: string | null,"task_id"?: string,"to_status"?: Database["public"]['Enums']["task_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_updates_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_updates_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assigned_to": string,"completed_at": string | null,"completed_quantity": number | null,"completion_note": string | null,"created_at": string,"created_by": string,"department_id": string | null,"description": string | null,"due_at": string | null,"id": string,"priority": Database["public"]['Enums']["task_priority"],"reviewed_at": string | null,"reviewed_by": string | null,"start_date": string | null,"status": Database["public"]['Enums']["task_status"],"target_quantity": number | null,"task_number": number,"title": string,"unit": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to": string,"completed_at"?: string | null,"completed_quantity"?: number | null,"completion_note"?: string | null,"created_at"?: string,"created_by": string,"department_id"?: string | null,"description"?: string | null,"due_at"?: string | null,"id"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"target_quantity"?: number | null,"task_number"?: never,"title": string,"unit"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assigned_to"?: string,"completed_at"?: string | null,"completed_quantity"?: number | null,"completion_note"?: string | null,"created_at"?: string,"created_by"?: string,"department_id"?: string | null,"description"?: string | null,"due_at"?: string | null,"id"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"target_quantity"?: number | null,"task_number"?: never,"title"?: string,"unit"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_manage_assignee":
{ Args: { "p_assignee": string }; Returns: boolean
                           },
"cancel_task":
{ Args: { "p_reason": string,"p_task_id": string }; Returns: undefined
                           },
"colleague_names":
{ Args: Record<PropertyKey, never>; Returns: {
              "department_id": string,"designation": string,"full_name": string,"id": string
            }[]
                           },
"create_task":
{ Args: { "p_assigned_to": string,"p_description"?: string,"p_due_at"?: string,"p_priority"?: Database["public"]['Enums']["task_priority"],"p_start_date"?: string,"p_target_quantity"?: number,"p_title": string,"p_unit"?: string }; Returns: string
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"current_profile_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"edit_task":
{ Args: { "p_description": string,"p_due_at": string,"p_priority": Database["public"]['Enums']["task_priority"],"p_start_date": string,"p_target_quantity": number,"p_task_id": string,"p_title": string,"p_unit": string }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_manager_of":
{ Args: { "target": string }; Returns: boolean
                           },
"lock_managed_open_task":
{ Args: { "p_task_id": string }; Returns: {
              "assigned_to": string,
"completed_at": string | null,
"completed_quantity": number | null,
"completion_note": string | null,
"created_at": string,
"created_by": string,
"department_id": string | null,
"description": string | null,
"due_at": string | null,
"id": string,
"priority": Database["public"]['Enums']["task_priority"],
"reviewed_at": string | null,
"reviewed_by": string | null,
"start_date": string | null,
"status": Database["public"]['Enums']["task_status"],
"target_quantity": number | null,
"task_number": number,
"title": string,
"unit": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "tasks"
        isOneToOne: true
        isSetofReturn: false
      } },
"reassign_task":
{ Args: { "p_new_assignee": string,"p_reason"?: string,"p_task_id": string }; Returns: undefined
                           },
"require_profile":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"review_task":
{ Args: { "p_decision": string,"p_note"?: string,"p_task_id": string }; Returns: undefined
                           },
"update_task_progress":
{ Args: { "p_completed_quantity"?: number,"p_new_status"?: Database["public"]['Enums']["task_status"],"p_note"?: string,"p_task_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "admin"|"manager"|"employee","employment_status": "active"|"inactive","task_priority": "low"|"medium"|"high"|"urgent","task_status": "to_do"|"in_progress"|"blocked"|"submitted_for_review"|"completed"|"reopened"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin", "manager", "employee"],"employment_status": ["active", "inactive"],"task_priority": ["low", "medium", "high", "urgent"],"task_status": ["to_do", "in_progress", "blocked", "submitted_for_review", "completed", "reopened", "cancelled"]
          }
        }
} as const
