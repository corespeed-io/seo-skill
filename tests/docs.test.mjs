import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const docs = ["README.md", "SKILL.md", "PROVENANCE.md", ...readdirSync(join(root, "references")).map((f) => `references/${f}`)];

test("SKILL.md has the frontmatter an agent reads", () => {
  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: corespeed-seo\ndescription: .{40,}\n/);
});

test("every relative link in the documents resolves to a file", () => {
  for (const doc of docs) {
    const text = readFileSync(join(root, doc), "utf8");
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const path = resolve(dirname(join(root, doc)), target.split("#")[0]);
      assert.ok(existsSync(path), `${doc} links to missing ${target}`);
    }
  }
});

test("no license is claimed while the license decision is pending", () => {
  assert.equal(existsSync(join(root, "LICENSE")), false);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, "UNLICENSED");
  assert.equal(pkg.dependencies, undefined);
});

test("the examples are synthetic: example.com only", () => {
  for (const file of readdirSync(join(root, "examples"))) {
    const text = readFileSync(join(root, "examples", file), "utf8");
    const domains = [...text.matchAll(/https?:\/\/([^/"]+)/g)].map((m) => m[1]);
    for (const domain of domains) assert.match(domain, /(^|\.)example\.com$/, `${file}: ${domain}`);
    assert.doesNotMatch(text, /corespeed\.io|monid\.ai/, file);
  }
});
