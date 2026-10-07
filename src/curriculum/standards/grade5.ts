import type { StandardInfo } from '../types';

const OA_1 = 'Write and interpret numerical expressions.';
const OA_2 = 'Analyze patterns and relationships.';
const NBT_1 = 'Understand the place value system.';
const NBT_2 = 'Perform operations with multi-digit whole numbers and with decimals to hundredths.';
const NF_1 = 'Use equivalent fractions as a strategy to add and subtract fractions.';
const NF_2 = 'Apply and extend previous understandings of multiplication and division to multiply and divide fractions.';
const MD_1 = 'Convert like measurement units within a given measurement system.';
const MD_2 = 'Represent and interpret data.';
const MD_3 = 'Geometric measurement: understand concepts of volume and relate volume to multiplication and to addition.';
const G_1 = 'Graph points on the coordinate plane to solve real-world and mathematical problems.';
const G_2 = 'Classify two-dimensional figures into categories based on their properties.';

/** Grade 5 content standards (official CA CCSSM text; long lettered sub-parts lightly abridged). */
export const GRADE_5_STANDARDS: readonly StandardInfo[] = [
  {
    code: '5.OA.1',
    grade: '5',
    domain: 'OA',
    cluster: OA_1,
    text: 'Use parentheses, brackets, or braces in numerical expressions, and evaluate expressions with these symbols.',
  },
  {
    code: '5.OA.2',
    grade: '5',
    domain: 'OA',
    cluster: OA_1,
    text: 'Write simple expressions that record calculations with numbers, and interpret numerical expressions without evaluating them. For example, express the calculation “add 8 and 7, then multiply by 2” as 2 × (8 + 7). Recognize that 3 × (18932 + 921) is three times as large as 18932 + 921, without having to calculate the indicated sum or product.',
  },
  {
    code: '5.OA.2.1',
    grade: '5',
    domain: 'OA',
    cluster: OA_1,
    text: 'Express a whole number in the range 2–50 as a product of its prime factors. For example, find the prime factors of 24 and express 24 as 2 × 2 × 2 × 3.',
    caAddition: true,
  },
  {
    code: '5.OA.3',
    grade: '5',
    domain: 'OA',
    cluster: OA_2,
    text: 'Generate two numerical patterns using two given rules. Identify apparent relationships between corresponding terms. Form ordered pairs consisting of corresponding terms from the two patterns, and graph the ordered pairs on a coordinate plane. For example, given the rule “Add 3” and the starting number 0, and given the rule “Add 6” and the starting number 0, observe that the terms in one sequence are twice the corresponding terms in the other sequence.',
  },
  {
    code: '5.NBT.1',
    grade: '5',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right and 1/10 of what it represents in the place to its left.',
  },
  {
    code: '5.NBT.2',
    grade: '5',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Explain patterns in the number of zeros of the product when multiplying a number by powers of 10, and explain patterns in the placement of the decimal point when a decimal is multiplied or divided by a power of 10. Use whole-number exponents to denote powers of 10.',
  },
  {
    code: '5.NBT.3',
    grade: '5',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Read, write, and compare decimals to thousandths. a. Read and write decimals to thousandths using base-ten numerals, number names, and expanded form, e.g., 347.392 = 3 × 100 + 4 × 10 + 7 × 1 + 3 × (1/10) + 9 × (1/100) + 2 × (1/1000). b. Compare two decimals to thousandths based on meanings of the digits in each place, using >, =, and < symbols to record the results of comparisons.',
  },
  {
    code: '5.NBT.4',
    grade: '5',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Use place value understanding to round decimals to any place.',
  },
  {
    code: '5.NBT.5',
    grade: '5',
    domain: 'NBT',
    cluster: NBT_2,
    text: 'Fluently multiply multi-digit whole numbers using the standard algorithm.',
  },
  {
    code: '5.NBT.6',
    grade: '5',
    domain: 'NBT',
    cluster: NBT_2,
    text: 'Find whole-number quotients of whole numbers with up to four-digit dividends and two-digit divisors, using strategies based on place value, the properties of operations, and/or the relationship between multiplication and division. Illustrate and explain the calculation by using equations, rectangular arrays, and/or area models.',
  },
  {
    code: '5.NBT.7',
    grade: '5',
    domain: 'NBT',
    cluster: NBT_2,
    text: 'Add, subtract, multiply, and divide decimals to hundredths, using concrete models or drawings and strategies based on place value, properties of operations, and/or the relationship between addition and subtraction; relate the strategy to a written method and explain the reasoning used.',
  },
  {
    code: '5.NF.1',
    grade: '5',
    domain: 'NF',
    cluster: NF_1,
    text: 'Add and subtract fractions with unlike denominators (including mixed numbers) by replacing given fractions with equivalent fractions in such a way as to produce an equivalent sum or difference of fractions with like denominators. For example, 2/3 + 5/4 = 8/12 + 15/12 = 23/12. (In general, a/b + c/d = (ad + bc)/bd.)',
  },
  {
    code: '5.NF.2',
    grade: '5',
    domain: 'NF',
    cluster: NF_1,
    text: 'Solve word problems involving addition and subtraction of fractions referring to the same whole, including cases of unlike denominators, e.g., by using visual fraction models or equations to represent the problem. Use benchmark fractions and number sense of fractions to estimate mentally and assess the reasonableness of answers.',
  },
  {
    code: '5.NF.3',
    grade: '5',
    domain: 'NF',
    cluster: NF_2,
    text: 'Interpret a fraction as division of the numerator by the denominator (a/b = a ÷ b). Solve word problems involving division of whole numbers leading to answers in the form of fractions or mixed numbers, e.g., by using visual fraction models or equations to represent the problem.',
  },
  {
    code: '5.NF.4',
    grade: '5',
    domain: 'NF',
    cluster: NF_2,
    text: 'Apply and extend previous understandings of multiplication to multiply a fraction or whole number by a fraction. a. Interpret the product (a/b) × q as a parts of a partition of q into b equal parts. (In general, (a/b) × (c/d) = ac/bd.) b. Find the area of a rectangle with fractional side lengths by tiling it with unit squares of the appropriate unit fraction side lengths, and show that the area is the same as would be found by multiplying the side lengths.',
  },
  {
    code: '5.NF.5',
    grade: '5',
    domain: 'NF',
    cluster: NF_2,
    text: 'Interpret multiplication as scaling (resizing), by: a. Comparing the size of a product to the size of one factor on the basis of the size of the other factor, without performing the indicated multiplication. b. Explaining why multiplying a given number by a fraction greater than 1 results in a product greater than the given number, and why multiplying by a fraction less than 1 results in a product smaller than the given number.',
  },
  {
    code: '5.NF.6',
    grade: '5',
    domain: 'NF',
    cluster: NF_2,
    text: 'Solve real-world problems involving multiplication of fractions and mixed numbers, e.g., by using visual fraction models or equations to represent the problem.',
  },
  {
    code: '5.NF.7',
    grade: '5',
    domain: 'NF',
    cluster: NF_2,
    text: 'Apply and extend previous understandings of division to divide unit fractions by whole numbers and whole numbers by unit fractions. a. Interpret division of a unit fraction by a non-zero whole number, and compute such quotients, e.g., (1/3) ÷ 4 = 1/12. b. Interpret division of a whole number by a unit fraction, and compute such quotients, e.g., 4 ÷ (1/5) = 20. c. Solve real-world problems involving division of unit fractions by non-zero whole numbers and division of whole numbers by unit fractions.',
  },
  {
    code: '5.MD.1',
    grade: '5',
    domain: 'MD',
    cluster: MD_1,
    text: 'Convert among different-sized standard measurement units within a given measurement system (e.g., convert 5 cm to 0.05 m), and use these conversions in solving multi-step, real-world problems.',
  },
  {
    code: '5.MD.2',
    grade: '5',
    domain: 'MD',
    cluster: MD_2,
    text: 'Make a line plot to display a data set of measurements in fractions of a unit (1/2, 1/4, 1/8). Use operations on fractions for this grade to solve problems involving information presented in line plots. For example, given different measurements of liquid in identical beakers, find the amount of liquid each beaker would contain if the total amount in all the beakers were redistributed equally.',
  },
  {
    code: '5.MD.3',
    grade: '5',
    domain: 'MD',
    cluster: MD_3,
    text: 'Recognize volume as an attribute of solid figures and understand concepts of volume measurement. a. A cube with side length 1 unit, called a “unit cube,” is said to have “one cubic unit” of volume. b. A solid figure which can be packed without gaps or overlaps using n unit cubes is said to have a volume of n cubic units.',
  },
  {
    code: '5.MD.4',
    grade: '5',
    domain: 'MD',
    cluster: MD_3,
    text: 'Measure volumes by counting unit cubes, using cubic cm, cubic in, cubic ft, and improvised units.',
  },
  {
    code: '5.MD.5',
    grade: '5',
    domain: 'MD',
    cluster: MD_3,
    text: 'Relate volume to the operations of multiplication and addition and solve real-world and mathematical problems involving volume. a. Find the volume of a right rectangular prism with whole-number side lengths by packing it with unit cubes. b. Apply the formulas V = l × w × h and V = b × h for rectangular prisms. c. Recognize volume as additive: find volumes of solid figures composed of two non-overlapping right rectangular prisms by adding the volumes of the non-overlapping parts.',
  },
  {
    code: '5.G.1',
    grade: '5',
    domain: 'G',
    cluster: G_1,
    text: 'Use a pair of perpendicular number lines, called axes, to define a coordinate system, with the intersection of the lines (the origin) arranged to coincide with the 0 on each line and a given point in the plane located by using an ordered pair of numbers, called its coordinates. Understand that the first number indicates how far to travel from the origin in the direction of one axis, and the second number indicates how far to travel in the direction of the second axis.',
  },
  {
    code: '5.G.2',
    grade: '5',
    domain: 'G',
    cluster: G_1,
    text: 'Represent real-world and mathematical problems by graphing points in the first quadrant of the coordinate plane, and interpret coordinate values of points in the context of the situation.',
  },
  {
    code: '5.G.3',
    grade: '5',
    domain: 'G',
    cluster: G_2,
    text: 'Understand that attributes belonging to a category of two-dimensional figures also belong to all subcategories of that category. For example, all rectangles have four right angles and squares are rectangles, so all squares have four right angles.',
  },
  {
    code: '5.G.4',
    grade: '5',
    domain: 'G',
    cluster: G_2,
    text: 'Classify two-dimensional figures in a hierarchy based on properties.',
  },
];
