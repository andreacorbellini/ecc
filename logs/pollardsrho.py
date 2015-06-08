#!/usr/bin/env python3

# This script makes use of another module: common.py, which can be
# found on GitHub:
#
#  https://github.com/andreacorbellini/ecc/blob/master/logs/common.py
#
# You must place that module on the same directory of this script
# prior to running it.

import random

from common import inverse_mod, tinycurve as curve


class PollardRhoSequence:

    def __init__(self, point1, point2):
        self.point1 = point1
        self.point2 = point2

        self.add_a1 = random.randrange(1, curve.n)
        self.add_b1 = random.randrange(1, curve.n)
        self.add_x1 = curve.add(
            curve.mult(self.add_a1, point1),
            curve.mult(self.add_b1, point2),
        )

        self.add_a2 = random.randrange(1, curve.n)
        self.add_b2 = random.randrange(1, curve.n)
        self.add_x2 = curve.add(
            curve.mult(self.add_a2, point1),
            curve.mult(self.add_b2, point2),
        )

    def __iter__(self):
        partition_size = curve.p // 3 + 1

        x = None
        a = 0
        b = 0

        while True:
            if x is None:
                i = 0
            else:
                i = x[0] // partition_size

            if i == 0:
                # x is either the point at infinity (None), or is in the first
                # third of the plane (x[0] <= curve.p / 3).
                a += self.add_a1
                b += self.add_b1
                x = curve.add(x, self.add_x1)
            elif i == 1:
                # x is in the second third of the plane
                # (curve.p / 3 < x[0] <= curve.p * 2 / 3).
                a *= 2
                b *= 2
                x = curve.double(x)
            elif i == 2:
                # x is in the last third of the plane (x[0] > curve.p * 2 / 3).
                a += self.add_a2
                b += self.add_b2
                x = curve.add(x, self.add_x2)
            else:
                raise AssertionError(i)

            a = a % curve.n
            b = b % curve.n

            yield x, a, b


def log(p, q, counter=None):
    assert curve.is_on_curve(p)
    assert curve.is_on_curve(q)

    # Pollard's Rho may fail sometimes: it may find a1 == a2 and b1 == b2,
    # leading to a division by zero error. Because PollardRhoSequence uses
    # random coefficients, we have more chances of finding the logarithm
    # if we try again, without affecting the asymptotic time complexity.
    # We try at most three times before giving up.
    for i in range(3):
        sequence = PollardRhoSequence(p, q)

        tortoise = iter(sequence)
        hare = iter(sequence)

        # The range is from 0 to curve.n - 1, but actually the algorithm will
        # stop much sooner (either finding the logarithm, or failing with a
        # division by zero).
        for j in range(curve.n):
            x1, a1, b1 = next(tortoise)

            x2, a2, b2 = next(hare)
            x2, a2, b2 = next(hare)

            if x1 == x2:
                if b1 == b2:
                    # This would lead to a division by zero. Try with
                    # another random sequence.
                    break

                x = (a1 - a2) * inverse_mod(b2 - b1, curve.n)
                logarithm = x % curve.n
                steps = i * curve.n + j + 1
                return logarithm, steps

    raise AssertionError('logarithm not found')


def main():
    x = random.randrange(1, curve.n)
    p = curve.g
    q = curve.mult(x, p)

    print('Curve: {}'.format(curve))
    print('Curve order: {}'.format(curve.n))
    print('p = (0x{:x}, 0x{:x})'.format(*p))
    print('q = (0x{:x}, 0x{:x})'.format(*q))
    print(x, '* p = q')

    y, steps = log(p, q)
    print('log(p, q) =', y)
    print('Took', steps, 'steps')

    assert x == y


if __name__ == '__main__':
    main()
