import {performance} from "perf_hooks"
import fs from "fs/promises";

async function measure(samples: number, fn: () => Promise<void> | void): Promise<{
  min: number;
  max: number;
  average: number;
  median: number;
  total: number;
  samples: number;
}> {
  const data: number[] = []; 
  for(let i = 0; i < samples; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    data.push(end - start);
  }
  data.sort((a, b) => a - b);
  return {
    min: data[0],
    max: data[data.length - 1],
    average: data.reduce((acc, curr) => acc + curr, 0) / data.length,
    median: data[Math.floor(data.length / 2)],
    total: data.reduce((acc, curr) => acc + curr, 0),
    samples: data.length,  
  }
}

async function runPerformanceTest(label: string, fn: () => Promise<void> | void) {
  const samples = 5000;
  const result = await measure(samples, fn);
  console.log(`${label}:`);
  for(const key in result) {
    if(key === "samples") {
      console.log(`  ${key}: ${result[key as keyof typeof result]}`)
      continue;
    }
    console.log(`  ${key}: ${result[key as keyof typeof result].toFixed(4)}ms`);

  }
}

async function main() {
  const testFiles = await fs.readdir(__dirname).then(files => files.filter(file => /\.perf\.(ts|js)$/.test(file)));
  for(const testFile of testFiles) {
    let {default: fn, label} = await import(`./${testFile}`);
    if(!label) {
      label = testFile.replace(/\.perf\.(ts|js)$/, "");
    }
    runPerformanceTest(label, fn);
  }
}

void main();