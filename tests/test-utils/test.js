/*
const crypto = require('crypto');

const generateA32BitUnsignedIntegerWithCryptoBetter = (min = 1, max = Math.pow(2, 31) - 1) => {
  if (min < 0 || max > Math.pow(2, 31) - 1 || min > max) {
    throw new Error('Invalid range');
  }
  const range = max - min + 1;
  const buffer = crypto.randomBytes(4);
  const maxInt32 = Math.pow(2, 32);
  // number -> (0, 2^32)
  const number = buffer.readUInt32BE(0);
  // operation =  number * range / (2^32)
  // number / (2^32) -> (0, 2^32) / (2^32) -> (0, 1)
  // (0, 1) * range -> (0, range)
  // scaled -> Math.floor(operation) -> [0, range)
  const scaled = Math.floor(number / (maxInt32 / range));
  // scaled + min -> [0, range) -> + min -> [min, range + min)
  //        -> [min, max - min +1 + min) -> [min, max+1)
  //        -> [min, max]
  return scaled + min;
};

const generateA32BitUnsignedIntegerWithCryptoWithBetterDistribution = (min = 1, max = Math.pow(2, 31) - 1) => {
  /!*
  Tests results with limits: min = 1, max =  Math.pow(2, 31) - 1
  Total repetitions: 6402193
  Total numbers: 10000000
  Unique numbers: 3597807
  Percentage of unique numbers: 35.978%
  {
  '1': 1058793, 1058793 numbers with 1 digit -> 10.588% of total numbers
  '2': 1059847, -> 10.598% of total numbers
  '3': 1060338, -> 10.603% of total numbers
  '4': 1059588, -> 10.596% of total numbers
  '5': 1056814, -> 10.568% of total numbers
  '6': 1058643, -> 10.586% of total numbers
  '7': 1058243, -> 10.582% of total numbers
  '8': 1052351, -> 10.524% of total numbers
  '9': 1000421, -> 10.004% of total numbers
  '10': 534963 -> 5.350% of total numbers
}
Number 1 repeated 523582 times -> 5.236% of total numbers
Number 2 repeated 126878 times -> 1.269% of total numbers
Number 8 repeated 58823 times -> 0.588% of total numbers
Number 6 repeated 58589 times -> 0.586% of total numbers
Number 4 repeated 58400 times -> 0.584% of total numbers
Number 5 repeated 58287 times -> 0.583% of total numbers
Number 7 repeated 58207 times -> 0.582% of total numbers
Number 3 repeated 58112 times -> 0.581% of total numbers
Number 9 repeated 57915 times -> 0.579% of total numbers
Number 14 repeated 52740 times -> 0.527% of total numbers
   *!/

  if (min < 0 || max > Math.pow(2, 32) - 1 || min > max) {
    throw new Error('Invalid range');
  }
  const range = max - min + 1;
  const buffer = crypto.randomBytes(4);
  const number = buffer.readUInt32BE(0);
  const scaled = Math.floor(number / (Math.pow(2, 32) / range));
  const result = scaled + min;
  const maxLengthDigit = result.toString().length;
  const minLengthDigit = 1;
  const index = Math.floor(Math.random() * (maxLengthDigit - minLengthDigit + 1) + minLengthDigit);
  return Number(result.toString().slice(0, index));
};

let i = 1;
const map = {};
const numbers = 10;
const mapOfLengths = {};
while (i <= numbers) {
  // create a map of repetitions
  const n = generateA32BitUnsignedIntegerWithCryptoBetter(1, 100);
  if (mapOfLengths[n.toString().length]) {
    mapOfLengths[n.toString().length]++;
  } else {
    mapOfLengths[n.toString().length] = 1;
  }
  if (map[n]) {
    map[n]++;
  } else {
    map[n] = 1;
  }
  i++;
}
console.log(mapOfLengths);
// print: With length n the porcentage of numbers is x%
for (const key in mapOfLengths) {
  console.log(`With length ${key} the porcentage of numbers is ${((mapOfLengths[key] / numbers) * 100).toFixed(3)}%`);
}
//map[generate_number] = repetitions;
// print the values with keys that have more than 1 repetition
const mapOfRepetitions = {};
for (const key in map) {
  const repetitions = map[key];
  //if repetitions is 1 continue
  if (repetitions === 1) {
    continue;
  }
  if (mapOfRepetitions[repetitions]) {
    mapOfRepetitions[repetitions].push(key);
  } else {
    //create an array and push the key
    mapOfRepetitions[repetitions] = [key];
  }
}
// mapOfRepetitions[repetitions] = [numbers]
let totalRepetitions = 0;
for (const key in mapOfRepetitions) {
  totalRepetitions += Number(key) * mapOfRepetitions[key].length;
}
console.log(`Total repetitions: ${totalRepetitions}`);
console.log(`Total numbers: ${numbers}`);
//unique numbers
console.log(`Unique numbers: ${numbers - totalRepetitions}`);
// poprcentage of unique numbers respect to total numbers, porcentage with 2 decimals
console.log(`Percentage of unique numbers: ${(((numbers - totalRepetitions) / numbers) * 100).toFixed(3)}%`);
// top ten repetitions
const topTenRepetitions = Object.keys(mapOfRepetitions)
  .sort((a, b) => b - a)
  .slice(0, 10);
console.log("top ten repetitions: " );
for (const key in topTenRepetitions) {
  const repetitions = topTenRepetitions[key];
  console.log(
    `Repetitions: ${repetitions}, #numbers: ${mapOfRepetitions[repetitions].length}, numbers: ${
      mapOfRepetitions[repetitions]
    }, porcentage: ${((repetitions * 100 * mapOfRepetitions[repetitions].length) / numbers).toFixed(3)}%`
  );
}
// console.log(mapOfRepetitions)

// 10 digits
// 3318032150
// 4294967295
// 2147483647 --> 2^31 - 1
// while(true) {
//   const min = 1;
//   const maxNumber = Math.pow(2, 31) - 1;
//   const n = generateA32BitUnsignedIntegerWithCryptoBetter();
//   console.log(n);
//   if (n < min || n > maxNumber) {
//     break;
//   }
// }

*/
