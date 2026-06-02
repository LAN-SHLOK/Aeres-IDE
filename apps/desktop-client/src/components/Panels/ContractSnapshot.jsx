import React, { useState, useEffect } from 'react'
import { useStore } from '../../store.js'
import { getTestFileName, getTestFrameworkName, detectTestCommand } from '../../utils/projectRunner.js'

// ── Language quality badge config ────────────────────────────────────────────
function QualityBadge({ callCount }) {
  if (callCount === 0) return (
    <span className="text-[9px] font-bold tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded leading-none border border-slate-700/50">STATIC</span>
  )
  if (callCount < 5) return (
    <span className="text-[9px] font-bold bg-amber-900/40 text-amber-400 border border-amber-700/40 px-1.5 py-0.5 rounded leading-none">LOW ({callCount})</span>
  )
  return (
    <span className="text-[9px] font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 px-1.5 py-0.5 rounded leading-none">HIGH ({callCount})</span>
  )
}

export default function ContractSnapshot() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const rootPath = useStore((s) => s.rootPath)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(null) // function name
  const [runningTest, setRunningTest] = useState(null) // function name
  const [offline, setOffline] = useState(false)
  const [framework, setFramework] = useState(null) // detected test framework

  async function fetchSummary() {
    if (!activeTab || !window.electron) return
    setLoading(true)
    try {
      const normalizedPath = activeTab.path.replace(/\\/g, '/')
      const res = await window.electron.analyze.contractSummary(normalizedPath)
      if (res?.error) {
        setOffline(true)
      } else {
        setSummary(Array.isArray(res) ? res : [])
        setOffline(false)
      }
    } catch (err) {
      console.error(err)
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
    const int = setInterval(fetchSummary, 5000)
    return () => clearInterval(int)
  }, [activeTab?.path])

  // Detect test framework when tab changes
  useEffect(() => {
    if (!activeTab) return
    setFramework(getTestFrameworkName(activeTab.language))
  }, [activeTab?.language])

  // ── Test generation ───────────────────────────────────────────────────────

  async function handleGenerate(fn) {
    if (!activeTab) return
    setGenerating(fn)
    try {
      let testCode = null

      // Try backend first
      if (window.electron?.analyze?.contractGenerate) {
        try {
          const normalizedPath = activeTab.path.replace(/\\/g, '/')
          const json = await window.electron.analyze.contractGenerate({
            file_path: normalizedPath,
            function_name: fn,
            language: activeTab.language
          })
          if (json?.tests && !json.error) {
            testCode = json.tests
          }
        } catch { /* backend offline, fall through to local generation */ }
      }

      // LLM Smart Fallback
      if (!testCode || testCode.includes('TODO: Add your input arguments here')) {
        try {
          if (window.electron?.rag?.query) {
            const lang = activeTab.language || 'javascript'
            const fwk = getTestFrameworkName(lang)
            const prompt = `You are an expert testing agent. Generate a robust unit test for the function '${fn}' in ${lang} using ${fwk} based on its signature in the following code. Provide highly REALISTIC mock data and edge case payloads. Return ONLY the raw test code inside a markdown code block with no explanations.

CRITICAL REQUIREMENT FOR COMPILATION:
You MUST generate 100% complete, fully compiling test code with all required test frameworks and imports included at the top:
- Python: Include 'import pytest' and the correct import from your module.
- Go: Prepend 'package main' and 'import ("testing")' and write standard Test... functions.
- Rust: Include standard #[cfg(test)] mod tests { use super::*; #[test] ... }
- Java: Include JUnit 5 imports.
- Kotlin: Include JUnit 5 imports.
- C#: Include 'using Xunit;' namespace.
- C++: Include '#include <gtest/gtest.h>'.
- Ruby: Include 'require "rspec"' / RSpec.describe block.
- Swift: Include 'import XCTest' and @testable import.
- Lua: Include busted describe/it blocks.
- Elixir: Include 'use ExUnit.Case' in defmodule.
- Haskell: Include 'import Test.Hspec'.
- Scala: Include ScalaTest AnyFunSpec.
- R: Include 'library(testthat)' and test_that blocks.
- Nim: Include 'import unittest' and suite/test blocks.
- Zig: Include 'const testing = std.testing' and test blocks.
- Erlang: Include -include_lib("eunit/include/eunit.hrl").
- Clojure: Include (use 'clojure.test) and deftest.
- PowerShell: Include Pester Describe/It/Should blocks.
- Shell: Include bats @test blocks.
- F#: Include 'open Xunit' and [<Fact>] attributes.

Ensure the test file compiles immediately with no placeholders.`
            const res = await window.electron.rag.query(prompt, activeTab.content)
            if (res && res.answer && !res.answer.toLowerCase().includes('error')) {
              const match = res.answer.match(/```[\w]*\n([\s\S]*?)```/)
              if (match && match[1]) {
                testCode = match[1].trim()
              } else {
                testCode = res.answer.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
              }
              const commentPrefix = ['python', 'r', 'ruby', 'nim', 'shell', 'powershell', 'elixir', 'lua'].includes(activeTab.language) ? '#' : '//'
              testCode = `${commentPrefix} Auto-generated by Aeres AI — Smart Static Analysis Mock\n${testCode}`
            }
          }
        } catch (e) { console.error('LLM generation failed', e) }
      }

      // Local language-specific fallback
      if (!testCode || testCode.includes('TODO: Add your input arguments here')) {
        testCode = _generateLocalFallback(fn, activeTab)
      }

      // Derive test file name
      const testFileName = getTestFileName(activeTab.name, activeTab.language || 'javascript', activeTab.content || '')
      // Fix: use lastIndexOf to safely replace only the filename at the end of the path
      const nameIdx = activeTab.path.lastIndexOf(activeTab.name)
      const testFilePath = nameIdx >= 0
        ? activeTab.path.substring(0, nameIdx) + testFileName
        : activeTab.path.replace(activeTab.name, testFileName)

      // Save to filesystem
      if (window.electron?.fs?.writeFile) {
        await window.electron.fs.writeFile(testFilePath, testCode)
      }

      // Resolve editor language
      const ext = testFileName.split('.').pop()
      const editorLanguage = _extToEditorLang(ext) || activeTab.language || 'javascript'

      // Open a new editor tab with the generated test
      const store = useStore.getState()
      store.openTab({
        name: testFileName,
        path: testFilePath,
        content: testCode,
        language: editorLanguage,
        isDirty: false
      })
      document.dispatchEvent(new CustomEvent('aeres:open-explorer'))
    } catch (err) {
      console.error('[ContractSnapshot] Generate failed:', err)
      const store = useStore.getState();
      store.appendOutputLog('error', `Failed to generate snapshot test: ${err.message}`);
      store.setActiveSidebarTab('output');
    } finally {
      setGenerating(null)
    }
  }

  // ── Run test in terminal ───────────────────────────────────────────────────

  async function handleRunTest(fn) {
    if (!activeTab || !window.electron) return
    setRunningTest(fn)
    try {
      const testFileName = getTestFileName(activeTab.name, activeTab.language || 'javascript', activeTab.content || '')
      // Fix: use lastIndexOf to safely replace only the filename at the end of the path
      const nameIdx = activeTab.path.lastIndexOf(activeTab.name)
      const testFilePath = nameIdx >= 0
        ? activeTab.path.substring(0, nameIdx) + testFileName
        : activeTab.path.replace(activeTab.name, testFileName)
      const cmd = await detectTestCommand(testFilePath, rootPath) || `echo "No test runner detected for ${activeTab.language}"`
      
      // Open or reuse terminal and run the command
      const store = useStore.getState()
      let termId = store.terminals.find(t => t.name === 'Test Runner')?.id
      if (!termId) {
        const dir = activeTab.path.includes('\\')
          ? activeTab.path.substring(0, activeTab.path.lastIndexOf('\\'))
          : activeTab.path.substring(0, activeTab.path.lastIndexOf('/'))
        const { id } = await window.electron.terminal.create({ cwd: dir || rootPath })
        store.addTerminal({ id, name: 'Test Runner' })
        termId = id
      }
      store.setActiveTerminalId(termId)
      store.setTerminalPanelOpen(true)
      setTimeout(() => {
        window.electron.terminal.write(termId, cmd + '\r')
      }, 300)
    } catch (err) {
      console.error('[ContractSnapshot] Run test failed:', err)
    } finally {
      setRunningTest(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!activeTab) return (
    <div className="p-8 text-center text-aeres-muted text-sm">Open a file to see observed behaviors.</div>
  )

  const lang = activeTab.language || 'unknown'

  return (
    <div className="flex flex-col h-full bg-aeres-bg">
      {/* Header */}
      <div className="p-3 border-b border-aeres-border flex justify-between items-center bg-aeres-surface/30">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Contract Snapshots</h3>
          {summary.some(s => s.callCount > 0) && (
            <span className="text-[10px] bg-aeres-violet/30 text-aeres-violet px-1.5 py-0.5 rounded-full font-bold">
              {summary.reduce((acc, s) => acc + s.callCount, 0)} TOTAL CALLS
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Framework badge */}
          {framework && (
            <span className="text-[9px] bg-aeres-surface text-aeres-violet border border-aeres-violet/30 px-1.5 py-0.5 rounded font-mono">
              {framework}
            </span>
          )}
          <button onClick={fetchSummary} title="Refresh Observations" className="p-1 hover:text-white transition-colors text-aeres-muted">
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Offline warning */}
      {offline && (
        <div className="mx-2 my-2 p-3 rounded-lg border border-yellow-800/40 bg-yellow-950/20 text-yellow-500 text-[11px] leading-relaxed">
          <div className="flex gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <span className="font-bold block mb-0.5">Observer Offline</span>
              Deep contract inspection sidecar is unreachable. Static analysis mode active — AI generation available.
            </div>
          </div>
        </div>
      )}

      {/* Function list */}
      <div className="flex-1 overflow-y-auto">
        {loading && summary.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
             <div className="w-8 h-8 rounded-full border-2 border-aeres-violet border-t-transparent animate-spin" />
             <span className="text-[10px] text-aeres-muted animate-pulse uppercase font-bold tracking-widest">Watching runtime artifacts...</span>
          </div>
        ) : summary.length === 0 ? (
          <div className="p-8 text-center text-aeres-muted text-xs">
            No functions detected yet. Run or debug your code, or check the file is a supported language.
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {summary.map(s => {
              const testFileName = getTestFileName(activeTab.name, lang, activeTab.content || '')
              return (
                <div key={s.function} className="p-3 rounded-lg border border-aeres-border bg-aeres-surface/40 group hover:border-aeres-violet/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-mono text-white truncate max-w-[160px]" title={s.function}>{s.function}</span>
                      <span className="text-[9px] text-aeres-muted/70 truncate" title={testFileName}>→ {testFileName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <QualityBadge callCount={s.callCount} />
                      {s.edgeCases > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded leading-none ${s.callCount === 0 ? 'bg-slate-800/50 text-slate-500' : 'bg-aeres-amber/20 text-aeres-amber'}`}>
                          {s.callCount === 0 ? `${s.edgeCases} params` : `${s.edgeCases} edges`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => handleGenerate(s.function)}
                      disabled={generating === s.function}
                      className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-aeres-border hover:bg-aeres-violet text-white transition-colors rounded shadow-sm disabled:opacity-50"
                    >
                      {generating === s.function ? '⏳ Generating...' : '⚡ Generate Test'}
                    </button>
                    <button
                      onClick={() => handleRunTest(s.function)}
                      disabled={runningTest === s.function}
                      title={`Run ${testFileName} in terminal`}
                      className="px-2.5 py-1.5 text-[10px] font-bold bg-emerald-900/30 hover:bg-emerald-700 text-emerald-400 hover:text-white border border-emerald-800/40 transition-colors rounded shadow-sm disabled:opacity-50"
                    >
                      {runningTest === s.function ? '⏳' : '▶'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-aeres-violet/5 border-t border-aeres-violet/20">
        <p className="text-[10px] text-aeres-violet/80 leading-relaxed italic">
          Aeres IDE anchors your code to reality by watching its true behavior at runtime, shielding you from assumption-based regressions.
        </p>
      </div>
    </div>
  )
}

// ── Local test generation fallback ───────────────────────────────────────────

function _generateLocalFallback(fn, activeTab) {
  const lang = activeTab.language || 'javascript'
  const stem = activeTab.name.replace(/\.[^/.]+$/, '')
  const isReact = activeTab.content?.includes('React') || activeTab.content?.includes('export default') || activeTab.name.endsWith('x') || activeTab.name.includes('page') || activeTab.name.includes('layout')
  const fnTitle = fn.charAt(0).toUpperCase() + fn.slice(1)
  const fnClass = fn.replace(/[_-](\w)/g, (_, c) => c.toUpperCase())

  switch (lang) {
    case 'python':
      return `# Auto-generated by Aeres IDE — Contract Snapshot Tests
import pytest
from ${stem} import ${fn}  # adjust import path as needed

class Test${fnClass.charAt(0).toUpperCase() + fnClass.slice(1)}Contract:
    """Snapshot tests for ${fn}() — generated from static analysis."""

    def test_basic_call(self):
        """Verify ${fn} returns a non-None result with default args."""
        result = ${fn}()
        assert result is not None

    def test_edge_case_none_input(self):
        try:
            result = ${fn}(None)
        except (TypeError, ValueError):
            pass

    def test_edge_case_empty(self):
        try:
            result = ${fn}("")
        except (TypeError, ValueError):
            pass

if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__]))
`

    case 'go':
      return `package main

import (
\t"testing"
)

// Auto-generated by Aeres IDE — Go Snapshot Tests for ${fn}
func Test${fnTitle}(t *testing.T) {
\tt.Run("basic call", func(t *testing.T) {
\t\t// TODO: call ${fn}() and assert
\t\tt.Log("Testing basic call for ${fn}")
\t})

\tt.Run("nil input", func(t *testing.T) {
\t\t// TODO: test ${fn} with nil/zero values
\t\tt.Log("Testing nil input for ${fn}")
\t})
}

func Benchmark${fnTitle}(b *testing.B) {
\tfor i := 0; i < b.N; i++ {
\t\t// TODO: call ${fn}()
\t}
}
`

    case 'rust':
      return `// Auto-generated by Aeres IDE — Rust Snapshot Tests for ${fn}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_${fn.toLowerCase()}_basic() {
        // TODO: call ${fn}() and assert
        assert!(true, "Replace with real assertion");
    }

    #[test]
    fn test_${fn.toLowerCase()}_edge_none() {
        // TODO: test with None/Option values
        assert!(true);
    }

    #[test]
    fn test_${fn.toLowerCase()}_edge_empty() {
        // TODO: test with empty collections
        assert!(true);
    }
}
`

    case 'java':
      return `// Auto-generated by Aeres IDE — Java JUnit5 Tests for ${fn}
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

public class ${stem}Test {

    @Test
    @DisplayName("${fn}: basic call returns non-null")
    void test${fnTitle}Basic() {
        assertNotNull(null, "Replace with real assertion");
    }

    @Test
    @DisplayName("${fn}: handles null input")
    void test${fnTitle}NullInput() {
        assertDoesNotThrow(() -> { /* ${fn}(null) */ });
    }
}
`

    case 'kotlin':
      return `// Auto-generated by Aeres IDE — Kotlin JUnit5 Tests for ${fn}
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class ${stem}Test {

    @Test
    fun \`test ${fn} basic call\`() {
        assertTrue(true, "Replace with real assertion")
    }

    @Test
    fun \`test ${fn} null input\`() {
        assertDoesNotThrow { /* ${fn}(null) */ }
    }
}
`

    case 'csharp':
      return `// Auto-generated by Aeres IDE — C# xUnit Tests for ${fn}
using System;
using Xunit;

public class ${stem}Tests
{
    [Fact]
    public void Test_${fn}_BasicCall()
    {
        Assert.True(true, "Replace with real assertion");
    }

    [Fact]
    public void Test_${fn}_NullInput()
    {
        var ex = Record.Exception(() => { /* ${fn}(null) */ });
        Assert.Null(ex);
    }
}
`

    case 'cpp':
    case 'c':
      return `// Auto-generated by Aeres IDE — C++ Google Test for ${fn}
#include <gtest/gtest.h>
#include "${stem}.h"

TEST(${stem}Test, ${fn}_BasicCall) {
    // TODO: call ${fn}() and assert
    SUCCEED();
}

TEST(${stem}Test, ${fn}_NullInput) {
    // TODO: test with nullptr
    SUCCEED();
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
`

    case 'ruby':
      return `# Auto-generated by Aeres IDE — Ruby RSpec Tests for ${fn}
require 'spec_helper'
require_relative '../${stem}'

RSpec.describe '#${fn}' do
  it 'returns a non-nil result with default args' do
    expect(${fn}()).not_to be_nil
  end

  it 'handles nil input gracefully' do
    expect { ${fn}(nil) }.not_to raise_error
  end

  it 'handles empty string input' do
    expect { ${fn}('') }.not_to raise_error
  end
end
`

    case 'php':
      return `<?php
// Auto-generated by Aeres IDE — PHPUnit Tests for ${fn}
use PHPUnit\\Framework\\TestCase;
require_once __DIR__ . '/../${stem}.php';

class ${stem.charAt(0).toUpperCase() + stem.slice(1)}Test extends TestCase
{
    public function test${fnTitle}BasicCall(): void
    {
        $this->assertTrue(true, 'Replace with real assertion');
    }

    public function test${fnTitle}NullInput(): void
    {
        $this->expectNotToPerformAssertions();
        // ${fn}(null);
    }
}
`

    case 'dart':
      return `// Auto-generated by Aeres IDE — Dart Unit Tests for ${fn}
import 'package:test/test.dart';
import '../lib/${stem}.dart';

void main() {
  group('${fn}', () {
    test('basic call should not throw', () {
      expect(true, isTrue);
    });

    test('null input is handled gracefully', () {
      expect(true, isTrue);
    });
  });
}
`

    case 'swift':
      return `// Auto-generated by Aeres IDE — Swift XCTest Tests for ${fn}
import XCTest
@testable import ${stem}

final class ${stem}Tests: XCTestCase {

    func test${fnTitle}BasicCall() {
        XCTAssertTrue(true, "Replace with real assertion")
    }

    func test${fnTitle}NilInput() {
        XCTAssertNoThrow({ /* ${fn}(nil) */ }())
    }
}
`

    case 'lua':
      return `-- Auto-generated by Aeres IDE — Lua Busted Tests for ${fn}
local ${stem} = require('${stem}')

describe('${fn}', function()
  it('returns a non-nil result with default args', function()
    assert.is_true(true) -- replace with: assert.is_not_nil(${stem}.${fn}())
  end)

  it('handles nil input gracefully', function()
    assert.has_no.errors(function()
      -- ${stem}.${fn}(nil)
    end)
  end)
end)
`

    case 'elixir': {
      const modName = stem.charAt(0).toUpperCase() + stem.slice(1)
      return `# Auto-generated by Aeres IDE — Elixir ExUnit Tests for ${fn}
defmodule ${modName}Test do
  use ExUnit.Case

  describe "${fn}" do
    test "basic call returns non-nil result" do
      # result = ${modName}.${fn}()
      # assert result != nil
      assert true
    end

    test "handles nil input gracefully" do
      assert true
    end
  end
end
`
    }

    case 'haskell':
      return `-- Auto-generated by Aeres IDE — Haskell HSpec Tests for ${fn}
module ${stem}Spec (spec) where

import Test.Hspec
import ${stem}

spec :: Spec
spec = do
  describe "${fn}" $ do
    it "returns a result with default args" $
      True \`shouldBe\` True

    it "handles edge case: empty input" $
      True \`shouldBe\` True

main :: IO ()
main = hspec spec
`

    case 'scala':
      return `// Auto-generated by Aeres IDE — Scala ScalaTest for ${fn}
import org.scalatest.funspec.AnyFunSpec
import org.scalatest.matchers.should.Matchers

class ${stem}Spec extends AnyFunSpec with Matchers {
  describe("${fn}") {
    it("should return a defined result with default args") {
      true shouldBe true
    }

    it("should handle None input gracefully") {
      true shouldBe true
    }
  }
}
`

    case 'r':
      return `# Auto-generated by Aeres IDE — R testthat Tests for ${fn}
library(testthat)
source("${stem}.R")

test_that("${fn} returns a non-NULL result", {
  expect_true(TRUE)
})

test_that("${fn} handles NULL input gracefully", {
  expect_no_error({ # ${fn}(NULL)
  })
})
`

    case 'perl':
      return `#!/usr/bin/perl
# Auto-generated by Aeres IDE — Perl Test::More Tests for ${fn}
use strict;
use warnings;
use Test::More tests => 2;

require_ok('${stem}');
ok(1, "${fn}: basic call placeholder");

done_testing();
`

    case 'shell':
      return `#!/usr/bin/env bats
# Auto-generated by Aeres IDE — Bats Shell Tests for ${fn}
setup() {
  source "./${stem}.sh"
}

@test "${fn}: basic call succeeds" {
  run ${fn}
  [ "$status" -eq 0 ]
}

@test "${fn}: handles empty argument" {
  run ${fn} ""
  [[ "$status" -le 1 ]]
}
`

    case 'powershell':
      return `# Auto-generated by Aeres IDE — PowerShell Pester Tests for ${fn}
BeforeAll {
    . "$PSScriptRoot/${stem}.ps1"
}

Describe '${fn}' {
    It 'returns a non-null result with default args' {
        $true | Should -BeTrue
    }

    It 'handles null input without throwing' {
        { ${fn} $null } | Should -Not -Throw
    }
}
`

    case 'nim':
      return `# Auto-generated by Aeres IDE — Nim unittest Tests for ${fn}
import unittest
import ${stem}

suite "${fn} tests":
  test "basic call succeeds":
    check true

  test "edge case: empty string":
    check true
`

    case 'zig':
      return `// Auto-generated by Aeres IDE — Zig std.testing Tests for ${fn}
const std = @import("std");
const testing = std.testing;
const ${stem} = @import("${stem}.zig");

test "${fn}: basic call" {
    try testing.expect(true);
}

test "${fn}: null/zero input" {
    try testing.expect(true);
}
`

    case 'fsharp':
      return `// Auto-generated by Aeres IDE — F# xUnit Tests for ${fn}
module ${stem}Tests

open Xunit
open ${stem}

[<Fact>]
let \`\`${fn} returns a result with default args\`\` () =
    Assert.True(true)

[<Fact>]
let \`\`${fn} handles None input\`\` () =
    Assert.True(true)
`

    case 'clojure': {
      const nsName = stem.replace(/_/g, '-')
      return `;; Auto-generated by Aeres IDE — Clojure clojure.test Tests for ${fn}
(ns ${nsName}-test
  (:require [clojure.test :refer [deftest testing is run-tests]]
            [${nsName} :refer [${fn}]]))

(deftest test-${fn}
  (testing "basic call returns non-nil"
    (is true))

  (testing "handles nil input gracefully"
    (is true)))

(run-tests)
`
    }

    case 'erlang':
      return `%% Auto-generated by Aeres IDE — Erlang EUnit Tests for ${fn}
-module(${stem}_test).
-include_lib("eunit/include/eunit.hrl").

${fn}_basic_test() ->
    ?assert(true).

${fn}_null_test() ->
    ?assert(true).
`

    case 'typescript':
    case 'typescriptreact':
      if (isReact) {
        return `// Auto-generated by Aeres IDE — React/TypeScript Component Tests
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ${stem} from './${stem}';

describe('${stem} Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<${stem} />);
    expect(container).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    render(<${stem} />);
    const buttons = screen.queryAllByRole('button');
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
    }
  });
});
`
      }
      return `// Auto-generated by Aeres IDE — TypeScript Jest Tests for ${fn}
import { ${fn} } from './${stem}';

describe('${fn} contract snapshots', () => {
  it('should return a defined result with default args', () => {
    const result = ${fn}();
    expect(result).toBeDefined();
  });

  it('should handle null input gracefully', () => {
    expect(() => ${fn}(null as any)).not.toThrow();
  });

  it('should handle empty string', () => {
    expect(() => ${fn}('' as any)).not.toThrow();
  });
});
`

    case 'javascript':
    case 'javascriptreact':
    default:
      if (isReact) {
        return `// Auto-generated by Aeres IDE — React Component Unit Tests
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ${stem} from './${stem}';

describe('${stem} Component', () => {
  it('should render correctly with default props', () => {
    const { container } = render(<${stem} />);
    expect(container).toBeInTheDocument();
  });

  it('should support interacting with the component', () => {
    const { container } = render(<${stem} />);
    const buttons = container.querySelectorAll('button');
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
    }
  });
});
`
      }
      return `// Auto-generated by Aeres IDE — Contract Snapshot Tests
import { ${fn} } from './${stem}';

describe('${fn} contract snapshots', () => {
  it('should return a defined result with default args', () => {
    const result = ${fn}();
    expect(result).toBeDefined();
  });

  it('should handle null input gracefully', () => {
    expect(() => ${fn}(null)).not.toThrow();
  });

  it('should handle empty string input', () => {
    expect(() => ${fn}('')).not.toThrow();
  });

  it('should handle edge case: zero', () => {
    const result = ${fn}(0);
    expect(result).toBeDefined();
  });
});
`
  }
}

function _extToEditorLang(ext) {
  const m = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', go: 'go', rs: 'rust',
    cs: 'csharp', java: 'java', kt: 'kotlin',
    rb: 'ruby', php: 'php', cpp: 'cpp', c: 'cpp',
    dart: 'dart', swift: 'swift', lua: 'lua',
    ex: 'elixir', exs: 'elixir', hs: 'haskell',
    scala: 'scala', r: 'r', pl: 'perl',
    sh: 'shell', ps1: 'powershell', nim: 'nim',
    zig: 'zig', fs: 'fsharp', fsx: 'fsharp',
    clj: 'clojure', cljs: 'clojure', erl: 'erlang',
    bats: 'shell', t: 'perl',
  }
  return m[ext] || null
}
