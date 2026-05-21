import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rnxiudmyhqqbyzhzjpqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGl1ZG15aHFxYnl6aHpqcHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzIxMjMsImV4cCI6MjA4NTA0ODEyM30.tY2W1uuOFewFUkPFkru3GDjkpmvZJcCkwnGAwCWCBpA';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const auth = supabase.auth;
export const db = 'SUPABASE_MOCK';

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      callback({ uid: session.user.id, email: session.user.email });
    } else {
      callback(null);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      callback({ uid: session.user.id, email: session.user.email });
    } else {
      callback(null);
    }
  });
  
  return () => {
    subscription.unsubscribe();
  };
};

export const signOut = (authObj: any) => supabase.auth.signOut();
export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return { user: { uid: data.user.id, email: data.user.email } };
};
export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) throw error;
  return { user: { uid: data.user?.id, email: data.user?.email } };
};

export const collection = (dbObj: any, name: string) => name;
export const doc = (dbObj: any, col: string, id?: string) => id ? { col, id } : { col, id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString() };
export const query = (colName: string, ...args: any[]) => ({ colName, args });
export const where = (field: string, op: string, val: any) => ({ type: 'where', field, op, val });
export const orderBy = (field: string, dir: string = 'asc') => ({ type: 'order', field, dir });
export const limit = (n: number) => ({ type: 'limit', n });
export const documentId = () => 'id';

export const getDocs = async (q: any) => {
  if (typeof q === 'string') {
    const { data, error } = await supabase.from(q).select('*');
    if (error) throw error;
    return {
      empty: !data || data.length === 0,
      size: data?.length || 0,
      forEach: (cb: any) => (data || []).forEach((d: any) => cb({ id: d.id, data: () => d, ref: { col: q, id: d.id } })),
      docs: (data || []).map((d: any) => ({ id: d.id, data: () => d, ref: { col: q, id: d.id } }))
    };
  }

  let builder: any = supabase.from(q.colName).select('*');
  for (let arg of q.args) {
    if (arg.type === 'where') {
      if (arg.op === '==') builder = builder.eq(arg.field, arg.val);
      else if (arg.op === '!=') builder = builder.neq(arg.field, arg.val);
      else if (arg.op === 'in') builder = builder.in(arg.field, arg.val);
    } else if (arg.type === 'order') {
      builder = builder.order(arg.field, { ascending: arg.dir === 'asc' });
    } else if (arg.type === 'limit') {
      builder = builder.limit(arg.n);
    }
  }
  const { data, error } = await builder;
  if (error) throw error;
  return {
    empty: !data || data.length === 0,
    size: data?.length || 0,
    forEach: (cb: any) => (data || []).forEach((d: any) => cb({ id: d.id, data: () => d, ref: { col: q.colName, id: d.id } })),
    docs: (data || []).map((d: any) => ({ id: d.id, data: () => d, ref: { col: q.colName, id: d.id } }))
  };
};

export const getDoc = async (ref: any) => {
  if (!ref.id) return { exists: () => false, data: () => undefined, id: ref.id, ref };
  const { data, error } = await supabase.from(ref.col).select('*').eq('id', ref.id).maybeSingle();
  if (error || !data) return { exists: () => false, data: () => undefined, id: ref.id, ref };
  return { exists: () => true, data: () => data, id: ref.id, ref };
};
export const getDocFromServer = getDoc;

export const setDoc = async (ref: any, data: any, options: any = {}) => {
  if (!ref.id) ref.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
  if (options.merge) {
    const { error } = await supabase.from(ref.col).update(data).eq('id', ref.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from(ref.col).upsert({ id: ref.id, ...data });
    if (error) throw error;
  }
};

export const updateDoc = async (ref: any, data: any) => {
  const { error } = await supabase.from(ref.col).update(data).eq('id', ref.id);
  if (error) throw error;
};

export const addDoc = async (col: string | any, data: any) => {
  const colName = typeof col === 'string' ? col : col.colName || col;
  const { data: res, error } = await supabase.from(colName).insert(data).select().single();
  if (error) throw error;
  return { id: res?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString()), ref: { col: colName, id: res?.id } };
};

export const deleteDoc = async (ref: any) => {
  const { error } = await supabase.from(ref.col).delete().eq('id', ref.id);
  if (error) throw error;
};

export const onSnapshot = (q: any, callback: any) => {
  getDocs(q).then(callback);
  return () => {};
};

export const count = async () => ({ data: { count: 0 } });

export const logAction = async (userId: string, action: string, details?: any) => {
  try {
    await supabase.from('logs').insert([{
      user_id: userId,
      action,
      details: details !== undefined ? JSON.stringify(details) : null,
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.error("Log error", e);
  }
};

export const uploadImage = async (imageData: string, bucketName: string = 'creations'): Promise<string> => {
  if (imageData.startsWith("data:image")) {
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed with status ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.url) return data.url;
    } catch (e) {
      console.error("Cloudinary upload proxy failed:", e);
      throw e;
    }
  }
  return imageData;
};

