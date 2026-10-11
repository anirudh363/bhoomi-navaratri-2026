// Quick sanity check of the answer grader: `npm run test:grading`
import { gradeOne } from "../src/lib/grading.js";

const cases = [
  [0, "ವೈದ್ಯ ಹೇಳಿದ್ದು ಹಾಲು ಅನ್ನ ರೋಗಿ ಬಯಸಿದ್ದು ಹಾಲು ಅನ್ನ", true],
  [0, "ವೈದ್ಯ ಹೆಳಿದು ಹಾಲು ಅನ್ನ ರೋಗಿ ಬಯಸಿದು ಹಾಲನ್ನ", true],
  [0, "vaidya heliddu haalu anna rogi bayasiddu haalu anna", true],
  [0, "ಹಾಲು ಅನ್ನ", false],
  [3, "ಉಪ್ಪಿಗಿನ್ತ ರುಚಿ ಇಲ್ಲ ತಾಯಿಗಿನ್ತ ಬಂದು ಇಲ್ಲ", true],
  [3, "uppiginta ruchiyilla thayiginta bandhuvilla", true],
  [4, "kai kesaradre baayi mosaru", true],
  [4, "ಕೈ ಕೆಸರಾದರೆ ಬಾಯಿ ಮೊಸರು", true],
  [4, "ಬಾಯಿ ಮೊಸರು", false],
  [7, "ಹಾಸಿಗೆ ಇದ್ದಷ್ಟು ಕಾಲು ಚಾಚು", true],
  [7, "hasige iddashtu kaalu chachu", true],
  [7, "ಕಾಲು ಚಾಚು", false],
  [10, "maathu belli mouna bangara", true],
  [10, "ಮಾತು ಬೆಳ್ಳಿ ಮೌನ ಬಂಗಾರ", true],
  [10, "ಮಾತು ಚಿನ್ನ", false],
  [15, "akalu kappadare haalu kappe", true],
  [15, "ಹಸು ಕಪ್ಪಾದರೆ ಹಾಲು ಕಪ್ಪೆ", null],
  [2, "something random", false],
  [8, "ಚಿಂತೆ ಇಲ್ಲದವನಿಗೆ ಸಂತೆಯಲ್ಲಿ ನಿದ್ದೆ", true],
];

let bad = 0;
for (const [k, guess, expected] of cases) {
  const r = gradeOne(guess, k);
  const ok = expected === null || r.auto === expected;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} #${k + 1} sim=${r.sim.toFixed(2)} auto=${r.auto}  ${guess}`);
}
console.log(bad ? `${bad} unexpected` : "all as expected");
process.exitCode = bad ? 1 : 0;
