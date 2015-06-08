#!/usr/bin/env python3

# This script makes use of another module: common.py, which can be
# found on GitHub:
#
#  https://github.com/andreacorbellini/ecc/blob/master/logs/common.py
#
# You must place that module on the same directory of this script
# prior to running it.

import random

from common import tinycurve as curve


def log(p, q):
    assert curve.is_on_curve(p)
    assert curve.is_on_curve(q)

    start = random.randrange(curve.n)
    r = curve.mult(start, p)

    for x in range(curve.n):
        if q == r:
            logarithm = (start + x) % curve.n
            steps = x + 1
            return logarithm, steps
        r = curve.add(r, p)

    raise AssertionError('logarithm not found')


def main():
    x = random.randrange(curve.n)
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
