const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const syncScript = fs.readFileSync(
  path.join(root, "scripts/sync-upstream-modules.sh"),
  "utf8"
);

function createSandbox({ existingModule }) {
  const sandbox = fs.mkdtempSync(
    path.join(os.tmpdir(), "surge-module-sync-")
  );
  const scriptsDir = path.join(sandbox, "scripts");
  const moduleDir = path.join(sandbox, "module");
  const binDir = path.join(sandbox, "bin");

  fs.mkdirSync(scriptsDir);
  fs.mkdirSync(moduleDir);
  fs.mkdirSync(binDir);
  fs.writeFileSync(
    path.join(scriptsDir, "sync-upstream-modules.sh"),
    syncScript,
    { mode: 0o755 }
  );
  fs.writeFileSync(
    path.join(scriptsDir, "manifest.tsv"),
    "module/example.sgmodule\thttps://example.test/module.sgmodule\tmirror\n"
  );
  fs.writeFileSync(
    path.join(binDir, "curl"),
    "#!/usr/bin/env bash\nprintf '%s\\n' \"$@\" > \"$CURL_ARGS_LOG\"\nexit 22\n",
    { mode: 0o755 }
  );

  if (existingModule) {
    fs.writeFileSync(
      path.join(moduleDir, "example.sgmodule"),
      "#!name=Existing module\n"
    );
  }

  return sandbox;
}

function runFailedDownload(sandbox) {
  return spawnSync("bash", ["scripts/sync-upstream-modules.sh"], {
    cwd: sandbox,
    encoding: "utf8",
    env: {
      ...process.env,
      CURL_ARGS_LOG: path.join(sandbox, "curl-args.log"),
      GITHUB_ACTIONS: "true",
      MANIFEST: "scripts/manifest.tsv",
      PATH: `${path.join(sandbox, "bin")}:${process.env.PATH}`,
    },
  });
}

test("module sync preserves an existing module after a failed download", (t) => {
  const sandbox = createSandbox({ existingModule: true });
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const result = runFailedDownload(sandbox);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /Syncing module\/example\.sgmodule <- https:\/\/example\.test\/module\.sgmodule/
  );
  assert.match(result.stdout, /::warning .*preserving the existing/);
  assert.match(result.stdout, /Preserved modules after download failures: 1/);
  assert.match(result.stderr, /preserving module\/example\.sgmodule/);
  assert.equal(
    fs.readFileSync(path.join(sandbox, "module/example.sgmodule"), "utf8"),
    "#!name=Existing module\n"
  );

  const curlArgs = fs.readFileSync(
    path.join(sandbox, "curl-args.log"),
    "utf8"
  );
  for (const argument of [
    "--connect-timeout",
    "--retry",
    "--retry-all-errors",
    "--retry-delay",
    "--retry-max-time",
  ]) {
    assert.match(curlArgs, new RegExp(`^${argument}$`, "m"));
  }
});

test("module sync fails when no existing module can be preserved", (t) => {
  const sandbox = createSandbox({ existingModule: false });
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const result = runFailedDownload(sandbox);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no existing module can be preserved/);
  assert.equal(
    fs.existsSync(path.join(sandbox, "module/example.sgmodule")),
    false
  );
});
