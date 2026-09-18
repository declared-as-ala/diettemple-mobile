const assert = require('assert');

// Re-implement the pure logic of findFirstIncompletePosition for test verification
function findFirstIncompletePosition(items, setLogs) {
  if (!items || items.length === 0) {
    return { exerciseIndex: 0, setIndex: 0, isAllComplete: false, completedExerciseIndices: [] };
  }

  const completedExerciseIndices = [];

  for (let i = 0; i < items.length; i++) {
    const targetSets = Number(items[i]?.sets) || 3;
    const logs = setLogs[i] ?? [];
    const completedSetsCount = logs.filter((s) => s?.completed).length;

    if (completedSetsCount >= targetSets && targetSets > 0) {
      completedExerciseIndices.push(i);
    } else {
      const firstIncompleteSetIdx = logs.findIndex((s) => !s?.completed);
      const setIndex =
        firstIncompleteSetIdx >= 0
          ? firstIncompleteSetIdx
          : Math.min(completedSetsCount, targetSets - 1);
      return {
        exerciseIndex: i,
        setIndex: Math.max(0, setIndex),
        isAllComplete: false,
        completedExerciseIndices,
      };
    }
  }

  return {
    exerciseIndex: Math.max(0, items.length - 1),
    setIndex: 0,
    isAllComplete: true,
    completedExerciseIndices,
  };
}

console.log('Running workout resume reconciler tests...');

const sampleItems = [
  { sets: 3, exerciseId: 'ex1' },
  { sets: 3, exerciseId: 'ex2' },
  { sets: 4, exerciseId: 'ex3' },
  { sets: 3, exerciseId: 'ex4' },
];

// Test 1: Brand new workout (no logs) -> should resume at Exercise 1, Set 1 (index 0, 0)
{
  const res = findFirstIncompletePosition(sampleItems, {});
  assert.strictEqual(res.exerciseIndex, 0, 'New workout should start at exercise 0');
  assert.strictEqual(res.setIndex, 0, 'New workout should start at set 0');
  assert.strictEqual(res.isAllComplete, false);
  console.log('✓ Test 1 passed: Brand new workout starts at Exercise 1, Set 1');
}

// Test 2: Exercise 1 has 1 set completed -> should resume at Exercise 1, Set 2 (index 0, 1)
{
  const setLogs = {
    0: [{ completed: true, weightKg: 50, reps: 10 }],
  };
  const res = findFirstIncompletePosition(sampleItems, setLogs);
  assert.strictEqual(res.exerciseIndex, 0);
  assert.strictEqual(res.setIndex, 1);
  console.log('✓ Test 2 passed: Exercise 1 Set 1 done -> resumes at Exercise 1, Set 2');
}

// Test 3: Exercise 1 (3/3 done), Exercise 2 (3/3 done), Exercise 3 (1/4 done)
// -> MUST resume at Exercise 3, Set 2 (index 2, 1)
{
  const setLogs = {
    0: [{ completed: true }, { completed: true }, { completed: true }],
    1: [{ completed: true }, { completed: true }, { completed: true }],
    2: [{ completed: true, weightKg: 80, reps: 10 }],
  };
  const res = findFirstIncompletePosition(sampleItems, setLogs);
  assert.strictEqual(res.exerciseIndex, 2, 'Must resume at Exercise 3 (index 2)');
  assert.strictEqual(res.setIndex, 1, 'Must resume at Set 2 (index 1)');
  assert.deepStrictEqual(res.completedExerciseIndices, [0, 1]);
  assert.strictEqual(res.isAllComplete, false);
  console.log('✓ Test 3 passed: Ex 1 & Ex 2 done, Ex 3 Set 1 done -> resumes at Exercise 3, Set 2');
}

// Test 4: All exercises complete -> returns isAllComplete = true
{
  const setLogs = {
    0: [{ completed: true }, { completed: true }, { completed: true }],
    1: [{ completed: true }, { completed: true }, { completed: true }],
    2: [{ completed: true }, { completed: true }, { completed: true }, { completed: true }],
    3: [{ completed: true }, { completed: true }, { completed: true }],
  };
  const res = findFirstIncompletePosition(sampleItems, setLogs);
  assert.strictEqual(res.isAllComplete, true);
  assert.strictEqual(res.completedExerciseIndices.length, 4);
  console.log('✓ Test 4 passed: All exercises completed -> isAllComplete = true');
}

// Test 5: Sparse sets array with undefined holes
{
  const setLogs = {
    0: [{ completed: true }, undefined, { completed: false }],
  };
  const res = findFirstIncompletePosition(sampleItems, setLogs);
  assert.strictEqual(res.exerciseIndex, 0);
  assert.strictEqual(res.setIndex, 1, 'Should find undefined as first incomplete set');
  console.log('✓ Test 5 passed: Sparse array correctly resolves to first incomplete set');
}

console.log('All 5 workout resume reconciler tests passed successfully! 🎉');
