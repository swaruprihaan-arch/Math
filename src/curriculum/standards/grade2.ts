import type { StandardInfo } from '../types';

/** Grade 2 content standards (official CA CCSSM text). California additions are flagged with caAddition. */
export const GRADE_2_STANDARDS: readonly StandardInfo[] = [
  // Operations and Algebraic Thinking
  {
    code: '2.OA.1',
    grade: '2',
    domain: 'OA',
    cluster: 'Represent and solve problems involving addition and subtraction.',
    text:
      'Use addition and subtraction within 100 to solve one- and two-step word problems involving situations of adding to, taking from, putting together, taking apart, and comparing, with unknowns in all positions, e.g., by using drawings and equations with a symbol for the unknown number to represent the problem.',
  },
  {
    code: '2.OA.2',
    grade: '2',
    domain: 'OA',
    cluster: 'Add and subtract within 20.',
    text: 'Fluently add and subtract within 20 using mental strategies. By end of Grade 2, know from memory all sums of two one-digit numbers.',
  },
  {
    code: '2.OA.3',
    grade: '2',
    domain: 'OA',
    cluster: 'Work with equal groups of objects to gain foundations for multiplication.',
    text:
      'Determine whether a group of objects (up to 20) has an odd or even number of members, e.g., by pairing objects or counting them by 2s; write an equation to express an even number as a sum of two equal addends.',
  },
  {
    code: '2.OA.4',
    grade: '2',
    domain: 'OA',
    cluster: 'Work with equal groups of objects to gain foundations for multiplication.',
    text:
      'Use addition to find the total number of objects arranged in rectangular arrays with up to 5 rows and up to 5 columns; write an equation to express the total as a sum of equal addends.',
  },
  // Number and Operations in Base Ten
  {
    code: '2.NBT.1',
    grade: '2',
    domain: 'NBT',
    cluster: 'Understand place value.',
    text:
      'Understand that the three digits of a three-digit number represent amounts of hundreds, tens, and ones; e.g., 706 equals 7 hundreds, 0 tens, and 6 ones. Understand the following as special cases: ' +
      'a. 100 can be thought of as a bundle of ten tens—called a “hundred.” ' +
      'b. The numbers 100, 200, 300, 400, 500, 600, 700, 800, 900 refer to one, two, three, four, five, six, seven, eight, or nine hundreds (and 0 tens and 0 ones).',
  },
  {
    code: '2.NBT.2',
    grade: '2',
    domain: 'NBT',
    cluster: 'Understand place value.',
    text: 'Count within 1000; skip-count by 2s, 5s, 10s, and 100s.',
    caAddition: true,
  },
  {
    code: '2.NBT.3',
    grade: '2',
    domain: 'NBT',
    cluster: 'Understand place value.',
    text: 'Read and write numbers to 1000 using base-ten numerals, number names, and expanded form.',
  },
  {
    code: '2.NBT.4',
    grade: '2',
    domain: 'NBT',
    cluster: 'Understand place value.',
    text: 'Compare two three-digit numbers based on meanings of the hundreds, tens, and ones digits, using >, =, and < symbols to record the results of comparisons.',
  },
  {
    code: '2.NBT.5',
    grade: '2',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text: 'Fluently add and subtract within 100 using strategies based on place value, properties of operations, and/or the relationship between addition and subtraction.',
  },
  {
    code: '2.NBT.6',
    grade: '2',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text: 'Add up to four two-digit numbers using strategies based on place value and properties of operations.',
  },
  {
    code: '2.NBT.7',
    grade: '2',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text:
      'Add and subtract within 1000, using concrete models or drawings and strategies based on place value, properties of operations, and/or the relationship between addition and subtraction; relate the strategy to a written method. Understand that in adding or subtracting three-digit numbers, one adds or subtracts hundreds and hundreds, tens and tens, ones and ones; and sometimes it is necessary to compose or decompose tens or hundreds.',
  },
  {
    code: '2.NBT.7.1',
    grade: '2',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text: 'Use estimation strategies to make reasonable estimates in problem solving.',
    caAddition: true,
  },
  {
    code: '2.NBT.8',
    grade: '2',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text: 'Mentally add 10 or 100 to a given number 100–900, and mentally subtract 10 or 100 from a given number 100–900.',
  },
  {
    code: '2.NBT.9',
    grade: '2',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text: 'Explain why addition and subtraction strategies work, using place value and the properties of operations. (Explanations may be supported by drawings or objects.)',
  },
  // Measurement and Data
  {
    code: '2.MD.1',
    grade: '2',
    domain: 'MD',
    cluster: 'Measure and estimate lengths in standard units.',
    text: 'Measure the length of an object by selecting and using appropriate tools such as rulers, yardsticks, meter sticks, and measuring tapes.',
  },
  {
    code: '2.MD.2',
    grade: '2',
    domain: 'MD',
    cluster: 'Measure and estimate lengths in standard units.',
    text: 'Measure the length of an object twice, using length units of different lengths for the two measurements; describe how the two measurements relate to the size of the unit chosen.',
  },
  {
    code: '2.MD.3',
    grade: '2',
    domain: 'MD',
    cluster: 'Measure and estimate lengths in standard units.',
    text: 'Estimate lengths using units of inches, feet, centimeters, and meters.',
  },
  {
    code: '2.MD.4',
    grade: '2',
    domain: 'MD',
    cluster: 'Measure and estimate lengths in standard units.',
    text: 'Measure to determine how much longer one object is than another, expressing the length difference in terms of a standard length unit.',
  },
  {
    code: '2.MD.5',
    grade: '2',
    domain: 'MD',
    cluster: 'Relate addition and subtraction to length.',
    text:
      'Use addition and subtraction within 100 to solve word problems involving lengths that are given in the same units, e.g., by using drawings (such as drawings of rulers) and equations with a symbol for the unknown number to represent the problem.',
  },
  {
    code: '2.MD.6',
    grade: '2',
    domain: 'MD',
    cluster: 'Relate addition and subtraction to length.',
    text:
      'Represent whole numbers as lengths from 0 on a number line diagram with equally spaced points corresponding to the numbers 0, 1, 2, ..., and represent whole-number sums and differences within 100 on a number line diagram.',
  },
  {
    code: '2.MD.7',
    grade: '2',
    domain: 'MD',
    cluster: 'Work with time and money.',
    text:
      'Tell and write time from analog and digital clocks to the nearest five minutes, using a.m. and p.m. Know relationships of time (e.g., minutes in an hour, days in a month, weeks in a year).',
    caAddition: true,
  },
  {
    code: '2.MD.8',
    grade: '2',
    domain: 'MD',
    cluster: 'Work with time and money.',
    text:
      'Solve word problems involving dollar bills, quarters, dimes, nickels, and pennies, using $ and ¢ symbols appropriately. Example: If you have 2 dimes and 3 pennies, how many cents do you have?',
  },
  {
    code: '2.MD.9',
    grade: '2',
    domain: 'MD',
    cluster: 'Represent and interpret data.',
    text:
      'Generate measurement data by measuring lengths of several objects to the nearest whole unit, or by making repeated measurements of the same object. Show the measurements by making a line plot, where the horizontal scale is marked off in whole-number units.',
  },
  {
    code: '2.MD.10',
    grade: '2',
    domain: 'MD',
    cluster: 'Represent and interpret data.',
    text:
      'Draw a picture graph and a bar graph (with single-unit scale) to represent a data set with up to four categories. Solve simple put-together, take-apart, and compare problems using information presented in a bar graph.',
  },
  // Geometry
  {
    code: '2.G.1',
    grade: '2',
    domain: 'G',
    cluster: 'Reason with shapes and their attributes.',
    text:
      'Recognize and draw shapes having specified attributes, such as a given number of angles or a given number of equal faces. Identify triangles, quadrilaterals, pentagons, hexagons, and cubes.',
  },
  {
    code: '2.G.2',
    grade: '2',
    domain: 'G',
    cluster: 'Reason with shapes and their attributes.',
    text: 'Partition a rectangle into rows and columns of same-size squares and count to find the total number of them.',
  },
  {
    code: '2.G.3',
    grade: '2',
    domain: 'G',
    cluster: 'Reason with shapes and their attributes.',
    text:
      'Partition circles and rectangles into two, three, or four equal shares, describe the shares using the words halves, thirds, half of, a third of, etc., and describe the whole as two halves, three thirds, four fourths. Recognize that equal shares of identical wholes need not have the same shape.',
  },
];
