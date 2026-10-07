import type { StandardInfo } from '../types';

const OA_1 = 'Represent and solve problems involving multiplication and division.';
const OA_2 = 'Understand properties of multiplication and the relationship between multiplication and division.';
const OA_3 = 'Multiply and divide within 100.';
const OA_4 = 'Solve problems involving the four operations, and identify and explain patterns in arithmetic.';
const NBT_1 = 'Use place value understanding and properties of operations to perform multi-digit arithmetic.';
const NF_1 = 'Develop understanding of fractions as numbers.';
const MD_1 = 'Solve problems involving measurement and estimation of intervals of time, liquid volumes, and masses of objects.';
const MD_2 = 'Represent and interpret data.';
const MD_3 = 'Geometric measurement: understand concepts of area and relate area to multiplication and to addition.';
const MD_4 = 'Geometric measurement: recognize perimeter as an attribute of plane figures and distinguish between linear and area measures.';
const G_1 = 'Reason with shapes and their attributes.';

/** Grade 3 content standards (official CA CCSSM text; long lettered sub-parts lightly abridged). */
export const GRADE_3_STANDARDS: readonly StandardInfo[] = [
  {
    code: '3.OA.1',
    grade: '3',
    domain: 'OA',
    cluster: OA_1,
    text: 'Interpret products of whole numbers, e.g., interpret 5 × 7 as the total number of objects in 5 groups of 7 objects each. For example, describe a context in which a total number of objects can be expressed as 5 × 7.',
  },
  {
    code: '3.OA.2',
    grade: '3',
    domain: 'OA',
    cluster: OA_1,
    text: 'Interpret whole-number quotients of whole numbers, e.g., interpret 56 ÷ 8 as the number of objects in each share when 56 objects are partitioned equally into 8 shares, or as a number of shares when 56 objects are partitioned into equal shares of 8 objects each.',
  },
  {
    code: '3.OA.3',
    grade: '3',
    domain: 'OA',
    cluster: OA_1,
    text: 'Use multiplication and division within 100 to solve word problems in situations involving equal groups, arrays, and measurement quantities, e.g., by using drawings and equations with a symbol for the unknown number to represent the problem.',
  },
  {
    code: '3.OA.4',
    grade: '3',
    domain: 'OA',
    cluster: OA_1,
    text: 'Determine the unknown whole number in a multiplication or division equation relating three whole numbers. For example, determine the unknown number that makes the equation true in each of the equations 8 × ? = 48, 5 = ? ÷ 3, 6 × 6 = ?.',
  },
  {
    code: '3.OA.5',
    grade: '3',
    domain: 'OA',
    cluster: OA_2,
    text: 'Apply properties of operations as strategies to multiply and divide (commutative, associative, and distributive properties). Example: knowing that 8 × 5 = 40 and 8 × 2 = 16, one can find 8 × 7 as 8 × (5 + 2) = (8 × 5) + (8 × 2) = 40 + 16 = 56.',
  },
  {
    code: '3.OA.6',
    grade: '3',
    domain: 'OA',
    cluster: OA_2,
    text: 'Understand division as an unknown-factor problem. For example, find 32 ÷ 8 by finding the number that makes 32 when multiplied by 8.',
  },
  {
    code: '3.OA.7',
    grade: '3',
    domain: 'OA',
    cluster: OA_3,
    text: 'Fluently multiply and divide within 100, using strategies such as the relationship between multiplication and division (e.g., knowing that 8 × 5 = 40, one knows 40 ÷ 5 = 8) or properties of operations. By the end of Grade 3, know from memory all products of two one-digit numbers.',
  },
  {
    code: '3.OA.8',
    grade: '3',
    domain: 'OA',
    cluster: OA_4,
    text: 'Solve two-step word problems using the four operations. Represent these problems using equations with a letter standing for the unknown quantity. Assess the reasonableness of answers using mental computation and estimation strategies including rounding.',
  },
  {
    code: '3.OA.9',
    grade: '3',
    domain: 'OA',
    cluster: OA_4,
    text: 'Identify arithmetic patterns (including patterns in the addition table or multiplication table), and explain them using properties of operations. For example, observe that 4 times a number is always even, and explain why 4 times a number can be decomposed into two equal addends.',
  },
  {
    code: '3.NBT.1',
    grade: '3',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Use place value understanding to round whole numbers to the nearest 10 or 100.',
  },
  {
    code: '3.NBT.2',
    grade: '3',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Fluently add and subtract within 1000 using strategies and algorithms based on place value, properties of operations, and/or the relationship between addition and subtraction.',
  },
  {
    code: '3.NBT.3',
    grade: '3',
    domain: 'NBT',
    cluster: NBT_1,
    text: 'Multiply one-digit whole numbers by multiples of 10 in the range 10–90 (e.g., 9 × 80, 5 × 60) using strategies based on place value and properties of operations.',
  },
  {
    code: '3.NF.1',
    grade: '3',
    domain: 'NF',
    cluster: NF_1,
    text: 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts; understand a fraction a/b as the quantity formed by a parts of size 1/b.',
  },
  {
    code: '3.NF.2',
    grade: '3',
    domain: 'NF',
    cluster: NF_1,
    text: 'Understand a fraction as a number on the number line; represent fractions on a number line diagram. a. Represent a fraction 1/b on a number line diagram by partitioning the interval from 0 to 1 into b equal parts. b. Represent a fraction a/b on a number line diagram by marking off a lengths 1/b from 0.',
  },
  {
    code: '3.NF.3',
    grade: '3',
    domain: 'NF',
    cluster: NF_1,
    text: 'Explain equivalence of fractions in special cases, and compare fractions by reasoning about their size. a. Understand two fractions as equivalent if they are the same size, or the same point on a number line. b. Recognize and generate simple equivalent fractions, e.g., 1/2 = 2/4, 4/6 = 2/3. c. Express whole numbers as fractions, and recognize fractions that are equivalent to whole numbers. d. Compare two fractions with the same numerator or the same denominator by reasoning about their size, recording the results with >, =, or <.',
  },
  {
    code: '3.MD.1',
    grade: '3',
    domain: 'MD',
    cluster: MD_1,
    text: 'Tell and write time to the nearest minute and measure time intervals in minutes. Solve word problems involving addition and subtraction of time intervals in minutes, e.g., by representing the problem on a number line diagram.',
  },
  {
    code: '3.MD.2',
    grade: '3',
    domain: 'MD',
    cluster: MD_1,
    text: 'Measure and estimate liquid volumes and masses of objects using standard units of grams (g), kilograms (kg), and liters (l). Add, subtract, multiply, or divide to solve one-step word problems involving masses or volumes that are given in the same units.',
  },
  {
    code: '3.MD.3',
    grade: '3',
    domain: 'MD',
    cluster: MD_2,
    text: 'Draw a scaled picture graph and a scaled bar graph to represent a data set with several categories. Solve one- and two-step “how many more” and “how many less” problems using information presented in scaled bar graphs.',
  },
  {
    code: '3.MD.4',
    grade: '3',
    domain: 'MD',
    cluster: MD_2,
    text: 'Generate measurement data by measuring lengths using rulers marked with halves and fourths of an inch. Show the data by making a line plot, where the horizontal scale is marked off in appropriate units—whole numbers, halves, or quarters.',
  },
  {
    code: '3.MD.5',
    grade: '3',
    domain: 'MD',
    cluster: MD_3,
    text: 'Recognize area as an attribute of plane figures and understand concepts of area measurement. a. A square with side length 1 unit is said to have “one square unit” of area. b. A plane figure which can be covered without gaps or overlaps by n unit squares is said to have an area of n square units.',
  },
  {
    code: '3.MD.6',
    grade: '3',
    domain: 'MD',
    cluster: MD_3,
    text: 'Measure areas by counting unit squares (square cm, square m, square in, square ft, and improvised units).',
  },
  {
    code: '3.MD.7',
    grade: '3',
    domain: 'MD',
    cluster: MD_3,
    text: 'Relate area to the operations of multiplication and addition. a. Find the area of a rectangle with whole-number side lengths by tiling it. b. Multiply side lengths to find areas of rectangles in real-world and mathematical problems. c. Use area models to represent the distributive property. d. Recognize area as additive: find areas of rectilinear figures by decomposing them into non-overlapping rectangles and adding the areas.',
  },
  {
    code: '3.MD.8',
    grade: '3',
    domain: 'MD',
    cluster: MD_4,
    text: 'Solve real-world and mathematical problems involving perimeters of polygons, including finding the perimeter given the side lengths, finding an unknown side length, and exhibiting rectangles with the same perimeter and different areas or with the same area and different perimeters.',
  },
  {
    code: '3.G.1',
    grade: '3',
    domain: 'G',
    cluster: G_1,
    text: 'Understand that shapes in different categories (e.g., rhombuses, rectangles, and others) may share attributes (e.g., having four sides), and that the shared attributes can define a larger category (e.g., quadrilaterals). Recognize rhombuses, rectangles, and squares as examples of quadrilaterals, and draw examples of quadrilaterals that do not belong to any of these subcategories.',
  },
  {
    code: '3.G.2',
    grade: '3',
    domain: 'G',
    cluster: G_1,
    text: 'Partition shapes into parts with equal areas. Express the area of each part as a unit fraction of the whole. For example, partition a shape into 4 parts with equal area, and describe the area of each part as 1/4 of the area of the shape.',
  },
];
