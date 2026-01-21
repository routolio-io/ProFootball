// Use runtime require to avoid typing mismatches across testcontainers versions
// and to be resilient to different library exports.
// We use Wait strategies to ensure Postgres is ready before returning.
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
// Import testcontainers and cast to `any` so this helper remains compatible
// across different installed versions of the library.
import * as tcImport from 'testcontainers';
import * as net from 'net';
const tc: any = tcImport as any;

export async function startPostgres() {
  const username = 'test';
  const password = 'test';
  const database = 'profootball_test';

  const GenericContainer: any = tc.GenericContainer;

  let container: any;
  // Prefer PostgresContainer when available in the installed testcontainers package.
  if (tc.PostgresContainer) {
    try {
      container = await new tc.PostgresContainer('postgres:15-alpine')
        .withDatabase(database)
        .withUsername(username)
        .withPassword(password)
        .withStartupTimeout(120000)
        .start();
    } catch (err) {
      // fallback to GenericContainer if PostgresContainer usage fails
      console.warn(
        'PostgresContainer failed, falling back to GenericContainer:',
        err,
      );
      container = undefined;
    }
  }

  if (!container) {
    // Start container without wait strategy - we'll verify manually
    const builder: any = new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: database,
        POSTGRES_USER: username,
        POSTGRES_PASSWORD: password,
      })
      .withExposedPorts(5432);

    container = await builder.start();
  }

  // Always verify the port is listening manually (more reliable than wait strategies)
  const host: string = String(container.getHost());
  const port: number = Number(container.getMappedPort(5432));

  // Wait for port to be ready (this is more reliable than log message wait)
  await waitForPort(host, port, 60000);

  // Verify container is still running after port check
  try {
    // Check if container has an inspect method (available in testcontainers)
    if (typeof container.inspect === 'function') {
      const state = await container.inspect();
      if (state.State?.Status !== 'running') {
        throw new Error(
          `Container is not running. Status: ${state.State?.Status}`,
        );
      }
    }
  } catch (err) {
    // If inspect fails, log but don't fail - container might still be working
    console.warn('Could not verify container state:', err);
  }

  const config = {
    host,
    port,
    username,
    password,
    database,
  };

  return { container, config };
}

async function waitForPort(host: string, port: number, timeout = 60000) {
  const start = Date.now();
  const deadline = start + timeout;

  while (Date.now() < deadline) {
    const canConnect = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      const onError = () => {
        socket.destroy();
        resolve(false);
      };
      socket.setTimeout(2000);
      socket.once('error', onError);
      socket.once('timeout', onError);
      socket.connect(port, host, () => {
        socket.end();
        resolve(true);
      });
    });

    if (canConnect) return;
    // small backoff
    await new Promise((r) => setTimeout(r, 250));
  }

  throw new Error(`Timed out waiting for port ${host}:${port} to be ready`);
}
