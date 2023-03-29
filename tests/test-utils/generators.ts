import { TICKET_ATTRIBUTES } from '@utils/constants';
import crypto from 'crypto';
import { signJwtToken } from '@tests/test-utils/signJwtToken';
import { Ticket, TicketAttributes } from '@custom-types/index';
const { MAX_VALID_TITLE_LENGTH, MAX_INTEGER, MAX_DECIMALS } = TICKET_ATTRIBUTES;

const possibleValuesInt32 = Math.pow(2, 32);
// possibleValues  - negativeValues - zero = positiveValues
// Math.pow(2, 32) - Math.pow(2, 31) -1 = Math.pow(2, 31) - 1
const maxValueInt32 = Math.pow(2, 31) - 1;

const createRandomMultiplier = (maxZeros: number) => {
  if (maxZeros < 0) throw new Error('maxZeros must be greater than or equal to 0');
  const validValues = [];
  for (const i of Array(maxZeros + 1).keys()) {
    validValues.push(Math.pow(10, i));
  }
  const randomIndex = Math.floor(Math.random() * validValues.length);
  return validValues[randomIndex];
};

/*
 * Valid price: [1.0, 100000000.99] with MAX_INTEGER 8 and MAX_DECIMALS 2
 */
export const createAValidPrice = (): string => {
  const integerMultiplier = createRandomMultiplier(MAX_INTEGER);
  const decimalMultiplier = createRandomMultiplier(MAX_DECIMALS);
  // integerMultiplier -> [1, 10, ..., 10**8]
  //  1 - Math.random() -> (0, 1]
  // (0, 1] * [1, 10, ..., 10**8] -> [1, 10, ..., 10**8]
  // integerPriceValid -> [1, 10**8] with MAX_INTEGER 8
  const integerPrice = Math.ceil((1 - Math.random()) * integerMultiplier).toString();
  // decimalMultiplier -> [1, 10, 100]
  //  Math.random() -> [0, 1)
  // [0, 1) * [1, 10, 100] -> [0, 100) -> con floor -> [0, 99]
  // decimalPriceValid -> [0, 99] with MAX_DECIMALS 2
  const decimalPrice = Math.floor(Math.random() * decimalMultiplier).toString();
  return `${integerPrice}.${decimalPrice}`;
};
/*
 * With a valid integer part, the decimal part is invalid:
 * X -> digit between [1, 9]
 * [validIntegerPart.XXX , validIntegerPart.XXXXXXX]
 * With a valid decimal part, the integer part is invalid:
 * invalidIntegerPart -> the digits of the invalid integer part are between [MAX_INTEGER + 1, MAX_INTEGER + 5]
 */
export const createAnInvalidPrice = (): string => {
  const choice = Math.random() > 0.5 ? 'integer' : 'decimal';
  const validPrice = createAValidPrice();
  let [integer, decimal] = validPrice.toString().split('.');
  const numberOfDecimalsToAdd = Math.ceil(Math.random() * 6 + 1);
  switch (choice) {
    case 'decimal': {
      // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars -- because only the iteration is needed
      for (const i of Array(numberOfDecimalsToAdd).keys()) {
        const randomDigit = Math.ceil((1 - Math.random()) * 9).toString();
        decimal = decimal + randomDigit;
      }
      return `${integer}.${decimal}`;
    }
    case 'integer': {
      const integerDigitsToaAdd = MAX_INTEGER + Math.floor(Math.random() * 5);
      // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars -- because only the iteration is needed
      for (const i of Array(integerDigitsToaAdd).keys()) {
        const randomDigit = Math.ceil((1 - Math.random()) * 9).toString();
        integer = integer + randomDigit;
      }
      return `${integer}.${decimal}`;
    }
  }
};

/*
 * @param {number} maxStringLength - the maximum length of the string to be generated
 * @param {boolean} fixedLength - if true, the generated string will always be of length maxStringLength
 * @returns {string} - a random string of length between 1 and maxStringLength, not a number
 */
export const generateRandomString = (maxStringLength: number, fixedLength = false): string => {
  if (maxStringLength < 1) throw new Error('maxStringLength must be greater than or equal to 1');
  const randomString = crypto.randomBytes(maxStringLength).toString('hex');
  // randomStringLength -> [1,maxStringLength]
  const randomStringLength = Math.ceil((1 - Math.random()) * maxStringLength);
  const generatedString = randomString.slice(0, fixedLength ? maxStringLength : randomStringLength);
  if (isNaN(Number(generatedString))) return generatedString;
  return generateRandomString(maxStringLength, fixedLength);
};

export const generateA32BitUnsignedInteger = (min = 1, max = maxValueInt32) => {
  /*
  Tests results with limits: min = 1, max =  Math.pow(2, 31) - 1
  Total repetitions: 45980
  Total numbers: 10000000
  Unique numbers: 9954020
  Percentage of unique numbers: 99.540% -> depends entirely on the limits -> max - min ~ max
                                expected -> the max is a big value
  {
    '3': 4, 4 numbers with 3 digits -> 0.000% of total numbers
    '4': 47, -> 0.000% of total numbers
    '5': 430, -> 0.004% of total numbers
    '6': 4228, -> 0.042% of total numbers
    '7': 41692, -> 0.417% of total numbers
    '8': 419498, -> 4.195% of total numbers
    '9': 4192876, -> 41.929% of total numbers
    '10': 5341226 -> 53.412% of total numbers
  }
  1 number repeated 4 times -> 0.000% of total numbers
  34 numbers repeated 3 times -> 0.000% of total numbers
  22937 numbers repeated 2 times -> 0.459% of total numbers
  */
  if (min < 1 || max > maxValueInt32 || min > max) {
    throw new Error('Invalid range');
  }
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('min and max must be integers');
  }
  const range = max - min + 1;
  const buffer = crypto.randomBytes(4);
  // number -> (0, 2^32)
  const number = buffer.readUInt32BE(0);
  // operation =  number * range / (2^32)
  // number / (2^32) -> (0, 2^32) / (2^32) -> (0, 1)
  // (0, 1) * range -> (0, range)
  // scaled -> Math.floor(operation) -> [0, range)
  const scaled = Math.floor(number / (possibleValuesInt32 / range));
  // scaled + min -> [0, range) -> + min -> [min, range + min)
  //        -> [min, max - min +1 + min) -> [min, max+1)
  //        -> [min, max]
  return scaled + min;
};

export const generateA32BitUnsignedIntegerBetterDigitDistribution = (min = 1, max = maxValueInt32) => {
  /*
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
   */
  const result = generateA32BitUnsignedInteger(min, max);
  const maxLengthDigit = result.toString().length;
  const minLengthDigit = 1;
  const index = Math.floor(Math.random() * (maxLengthDigit - minLengthDigit + 1) + minLengthDigit);
  return Number(result.toString().slice(0, index));
};

export const createACookieSession = (user: { userEmail: string; userId: number }) => {
  const token = signJwtToken(user);
  const session = JSON.stringify({ jwt: token });
  const encodedSession = Buffer.from(session).toString('base64');
  return `session=${encodedSession}`;
};

export const generateValidTicketAttributes = (): TicketAttributes => {
  return {
    title: generateRandomString(MAX_VALID_TITLE_LENGTH),
    price: Number(createAValidPrice())
  };
};

export const generateValidTicket = (userId: number = generateA32BitUnsignedInteger()): Ticket => {
  return {
    ...generateValidTicketAttributes(),
    userId
  };
};
