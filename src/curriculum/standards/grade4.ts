import type { StandardInfo } from '../types';

const OA_1 = 'Use the four operations with whole numbers to solve problems.';
const OA_2 = 'Gain familiarity with factors and multiples.';
const OA_3 = 'Generate and analyze patterns.';
const NBT_1 = 'Generalize place value understanding for multi-digit whole numbers.';
const NBT_2 = 'Use place value understanding and properties of operations to perform multi-digit arithmetic.';
const NF_1 = 'Extend understanding of fraction equivalence and ordering.';
const NF_2 = 'Build fractions from unit fractions by applying and extending previous understandings of operations on whole numbers.';
const NF_3 = 'Understand decimal notation for fractions, and compare decimal fractions.';
const MD_1 = 'Solve problems involving measurement and conversion of measurements from a larger unit to a smaller unit.';
const MD_2 = 'Represent and interpret data.';
const MD_3 = 'Geometric measurement: understand concepts of angle and measure angles.';
const G_1 = 'Draw and identify lines and angles, and classify shapes by properties of their lines and angles.';

/** Grade 4 content standards (official CA CCSSM text; long lettered sub-parts lightly abridged). */
export const GRADE_4_STANDARDS: readonly StandardInfo[] = [
  {
    code: '4.OA.1',
    grade: '4',
    domain: 'OA',
    cluster: OA_1,
    text: 'Interpret a multiplication equation as a comparison, e.g., interpret 35 = 5 × 7 as a statement that 35 is 5 times as many as 7 and 7 times as many as 5. Represent verbal statements of multiplicative comparisons as multiplication equations.',
  },
  {
    code: '4.OA.2',
    grade: '4',
    domain: 'OA',
    cluster: OA_1,
    text: 'Multiply or divide to solve word problems involving multiplicative comparison, e.g., by using drawings and equations with a symbol for the unknown number to represent the problem, distinguishing multiplicative comparison from additive comparison.',
  },
  {
    code: '4.OA.3',
    grade: '4',
    domain: 'OA',
    cluster: OA_1,
    text: 'Solve multistep word problems posed with whole numbers and having whole-number answers using the four operations, including problems in which remainders must be interpreted. Represent these problems using equations with a letter standing for the unknown quantity. Assess the reasonableness of answers using mental computation and estimation strategies including rounding.',
  },
  {
    code: '4.OA.4',
    grade: '4',
    domain: 'OA',
    cluster: OA_2,
    text: 'Find all factor pairs for a whole number in the range 1–100. Recognize that a whole number is a multiple of each of its factors. Determine whether a given whole number in the range 1–100 is a multiple of a given one-digit number. Determine whether a given whole number in the range 1–100 is prime or composite.',
  },
  {
    code: '4.OA.5',
    grade: '4',
    domain: 'OA',
    cluster: OA_3,
    text: 'Generate a number or shape pattern that follows a given rule. Identify apparent features of the pattern that were not explicit in the rule itself. For example, given the rule “Add 3” and the starting number 1, generate terms in the resulting sequence and observe that the terms appear to alternate between odd and even numbers.',
  },
  {
    code: '4.NBT.1',
    grade: '4',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Recognize that in a multi-digit whole number, a digit in one place represents ten times what it represents in the place to its right. For example, recognize that 700 ÷ 70 = 10 by applying concepts of place value and division.',
  },
  {
    code: '4.NBT.2',
    grade: '4',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Read and write multi-digit whole numbers using base-ten numerals, number names, and expanded form. Compare two multi-digit numbers based on meanings of the digits in each place, using >, =, and < symbols to record the results of comparisons.',
  },
  {
    code: '4.NBT.3',
    grade: '4',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Use place value understanding to round multi-digit whole numbers to any place.',
  },
  {
    code: '4.NBT.4',
    grade: '4',
    domain: 'NBT',
    cluster: NBT_2,
    text: 'Fluently add and subtract multi-digit whole numbers using the standard algorithm.',
  },
  {
    code: '4.NBT.5',
    grade: '4',
    domain: 'NBT',
    cluster: NBT_2,
    text: 'Multiply a whole number of up to four digits by a one-digit whole number, and multiply two two-digit numbers, using strategies based on place value and the properties of operations. Illustrate and explain the calculation by using equations, rectangular arrays, and/or area models.',
  },
  {
    code: '4.NBT.6',
    grade: '4',
    domain: 'NBT',
    cluster: NBT_2,
    text: 'Find whole-number quotients and remainders with up to four-digit dividends and one-digit divisors, using strategies based on place value, the properties of operations, and/or the relationship between multiplication and division. Illustrate and explain the calculation by using equations, rectangular arrays, and/or area models.',
  },
  {
    code: '4.NF.1',
    grade: '4',
    domain: 'NF',
    cluster: NF_1,
    text: 'Explain why a fraction a/b is equivalent to a fraction (n × a)/(n × b) by using visual fraction models, with attention to how the number and size of the parts differ even though the two fractions themselves are the same size. Use this principle to recognize and generate equivalent fractions.',
  },
  {
    code: '4.NF.2',
    grade: '4',
    domain: 'NF',
    cluster: NF_1,
    text: 'Compare two fractions with different numerators and different denominators, e.g., by creating common denominators or numerators, or by comparing to a benchmark fraction such as 1/2. Recognize that comparisons are valid only when the two fractions refer to the same whole. Record the results of comparisons with symbols >, =, or <, and justify the conclusions.',
  },
  {
    code: '4.NF.3',
    grade: '4',
    domain: 'NF',
    cluster: NF_2,
    text: 'Understand a fraction a/b with a > 1 as a sum of fractions 1/b. a. Understand addition and subtraction of fractions as joining and separating parts referring to the same whole. b. Decompose a fraction into a sum of fractions with the same denominator in more than one way, e.g., 3/8 = 1/8 + 2/8. c. Add and subtract mixed numbers with like denominators. d. Solve word problems involving addition and subtraction of fractions referring to the same whole and having like denominators.',
  },
  {
    code: '4.NF.4',
    grade: '4',
    domain: 'NF',
    cluster: NF_2,
    text: 'Apply and extend previous understandings of multiplication to multiply a fraction by a whole number. a. Understand a fraction a/b as a multiple of 1/b. b. Understand a multiple of a/b as a multiple of 1/b, and use this understanding to multiply a fraction by a whole number: n × (a/b) = (n × a)/b. c. Solve word problems involving multiplication of a fraction by a whole number.',
  },
  {
    code: '4.NF.5',
    grade: '4',
    domain: 'NF',
    cluster: NF_3,
    text: 'Express a fraction with denominator 10 as an equivalent fraction with denominator 100, and use this technique to add two fractions with respective denominators 10 and 100. For example, express 3/10 as 30/100, and add 3/10 + 4/100 = 34/100.',
  },
  {
    code: '4.NF.6',
    grade: '4',
    domain: 'NF',
    cluster: NF_3,
    text: 'Use decimal notation for fractions with denominators 10 or 100. For example, rewrite 0.62 as 62/100; describe a length as 0.62 meters; locate 0.62 on a number line diagram.',
  },
  {
    code: '4.NF.7',
    grade: '4',
    domain: 'NF',
    cluster: NF_3,
    text: 'Compare two decimals to hundredths by reasoning about their size. Recognize that comparisons are valid only when the two decimals refer to the same whole. Record the results of comparisons with the symbols >, =, or <, and justify the conclusions, e.g., by using the number line or another visual model.',
    caAddition: true,
  },
  {
    code: '4.MD.1',
    grade: '4',
    domain: 'MD',
    cluster: MD_1,
    text: 'Know relative sizes of measurement units within one system of units including km, m, cm; kg, g; lb, oz.; l, ml; hr, min, sec. Within a single system of measurement, express measurements in a larger unit in terms of a smaller unit. Record measurement equivalents in a two-column table.',
  },
  {
    code: '4.MD.2',
    grade: '4',
    domain: 'MD',
    cluster: MD_1,
    text: 'Use the four operations to solve word problems involving distances, intervals of time, liquid volumes, masses of objects, and money, including problems involving simple fractions or decimals, and problems that require expressing measurements given in a larger unit in terms of a smaller unit.',
  },
  {
    code: '4.MD.3',
    grade: '4',
    domain: 'MD',
    cluster: MD_1,
    text: 'Apply the area and perimeter formulas for rectangles in real-world and mathematical problems. For example, find the width of a rectangular room given the area of the flooring and the length, by viewing the area formula as a multiplication equation with an unknown factor.',
  },
  {
    code: '4.MD.4',
    grade: '4',
    domain: 'MD',
    cluster: MD_2,
    text: 'Make a line plot to display a data set of measurements in fractions of a unit (1/2, 1/4, 1/8). Solve problems involving addition and subtraction of fractions by using information presented in line plots.',
  },
  {
    code: '4.MD.5',
    grade: '4',
    domain: 'MD',
    cluster: MD_3,
    text: 'Recognize angles as geometric shapes that are formed wherever two rays share a common endpoint, and understand concepts of angle measurement. a. An angle that turns through 1/360 of a circle is called a “one-degree angle.” b. An angle that turns through n one-degree angles is said to have an angle measure of n degrees.',
  },
  {
    code: '4.MD.6',
    grade: '4',
    domain: 'MD',
    cluster: MD_3,
    text: 'Measure angles in whole-number degrees using a protractor. Sketch angles of specified measure.',
  },
  {
    code: '4.MD.7',
    grade: '4',
    domain: 'MD',
    cluster: MD_3,
    text: 'Recognize angle measure as additive. When an angle is decomposed into non-overlapping parts, the angle measure of the whole is the sum of the angle measures of the parts. Solve addition and subtraction problems to find unknown angles on a diagram in real-world and mathematical problems.',
  },
  {
    code: '4.G.1',
    grade: '4',
    domain: 'G',
    cluster: G_1,
    text: 'Draw points, lines, line segments, rays, angles (right, acute, obtuse), and perpendicular and parallel lines. Identify these in two-dimensional figures.',
  },
  {
    code: '4.G.2',
    grade: '4',
    domain: 'G',
    cluster: G_1,
    text: 'Classify two-dimensional figures based on the presence or absence of parallel or perpendicular lines, or the presence or absence of angles of a specified size. Recognize right triangles as a category, and identify right triangles. (Two-dimensional shapes should include special triangles, e.g., equilateral, isosceles, scalene, and special quadrilaterals, e.g., rhombus, square, rectangle, parallelogram, trapezoid.)',
    caAddition: true,
  },
  {
    code: '4.G.3',
    grade: '4',
    domain: 'G',
    cluster: G_1,
    text: 'Recognize a line of symmetry for a two-dimensional figure as a line across the figure such that the figure can be folded along the line into matching parts. Identify line-symmetric figures and draw lines of symmetry.',
  },
];
