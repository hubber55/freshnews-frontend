import { PostgrestClient } from '@supabase/postgrest-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

type StorageObject = ReturnType<typeof createStorageClient>;

type RpcResult = Promise<{ data: unknown; error: Error | null }>;

type RestClient = {
  from: PostgrestClient<any>['from'];
  rpc: (fn: string, args?: Record<string, unknown>) => RpcResult;
  storage: StorageObject;
};

function createMissingClient(message: string) {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(message);
      },
    }
  ) as any;
}

function authHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function createStorageClient(key: string) {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, file: BodyInit) {
          const res = await fetch(
            `${supabaseUrl}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`,
            {
              method: 'POST',
              headers: {
                ...authHeaders(key),
                'Content-Type':
                  file instanceof File && file.type
                    ? file.type
                    : 'application/octet-stream',
                'x-upsert': 'false',
              },
              body: file,
            }
          );

          if (!res.ok) {
            return {
              data: null,
              error: new Error(await res.text()),
            };
          }

          return {
            data: { path },
            error: null,
          };
        },
        getPublicUrl(path: string) {
          return {
            data: {
              publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`,
            },
          };
        },
        async remove(paths: string[]) {
          for (const path of paths) {
            const res = await fetch(
              `${supabaseUrl}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`,
              {
                method: 'DELETE',
                headers: authHeaders(key),
              }
            );

            if (!res.ok) {
              return {
                data: null,
                error: new Error(await res.text()),
              };
            }
          }

          return {
            data: null,
            error: null,
          };
        },
      };
    },
  };
}

export function createRestClient(key: string): RestClient {
  if (!supabaseUrl || !key) {
    return createMissingClient('Supabase environment variables are not configured.');
  }

  const postgrest = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
    headers: authHeaders(key),
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
  });

  return {
    from: postgrest.from.bind(postgrest) as PostgrestClient<any>['from'],
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
          ...authHeaders(key),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
      });

      if (!res.ok) {
        return { data: null, error: new Error(await res.text()) };
      }

      const text = await res.text();
      return {
        data: text ? JSON.parse(text) : null,
        error: null,
      };
    },
    storage: createStorageClient(key),
  };
}

