import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const client = createClient(supabaseUrl, supabaseKey)

export const set = async (key: string, value: any): Promise<void> => {
  const supabase = client
  const { error } = await supabase.from("POS").upsert({
    key,
    value
  });
  if (error) {
    throw new Error(error.message);
  }
};

export const get = async (key: string): Promise<any> => {
  const supabase = client
  const { data, error } = await supabase.from("POS").select("value").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.value;
};
export const del = async (key: string): Promise<void> => {
  const supabase = client;
  const { error } = await supabase
    .from('POS')
    .delete().eq('key',key);
  
  if (error) {
    throw new Error(error.message);
  }
};

export const mset = async (key: string[], values:any[]): Promise<any> => {
  const supabase = client
  const { error } = await supabase.from("POS").upsert(key.map((k,i)=> ({key:k,value:values[i]})))
  if (error) {
    throw new Error(error.message);
  }
};

export const mget = async (keys: string[]): Promise<any[]> => {
  const supabase = client
  const { data, error } = await supabase.from("POS").select("value").in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};

// Deletes multiple key-value pairs from the database.
export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client
  const { error } = await supabase.from("POS").delete().in("key", keys);
  if (error) {
    throw new Error(error.message);
  }
};

// Search for key-value pairs by prefix.
export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client
  const { data, error } = await supabase.from("POS").select("key, value").like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};