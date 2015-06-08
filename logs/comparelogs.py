#!/usr/bin/env python3

import functools
import multiprocessing
import sys
import time

import bruteforce
import babygiantstep
import pollardsrho

from common import tinycurve as curve


def compute_one(func, x):
    p = curve.g
    q = curve.mult(x, p)

    try:
        y, steps = func(p, q)
    except Exception as exc:
        return x, str(exc)

    return x, y, steps


def compute_all(func):
    total_steps = 0
    compute_func = functools.partial(compute_one, func)

    with multiprocessing.Pool() as pool:
        results = pool.imap_unordered(compute_func, range(curve.n))

        for i, (x, y, steps) in enumerate(results):
            total_steps += steps

            if x != y:
                print('\nERROR: expected {}, got: {}'.format(x, y))

            if i % 100 == 0:
                print('\rComputing all logarithms: {:.2f}% done'
                      .format(100 * i / (curve.n - 1)), end='')
                sys.stdout.flush()

    print('\rComputing all logarithms: 100.00% done')

    return total_steps / curve.n


def main():
    all_mods = [
        bruteforce,
        babygiantstep,
        pollardsrho,
    ]

    print('Curve order: {}'.format(curve.n))

    for mod in all_mods:
        print('Using {}'.format(mod.__name__))

        start = time.monotonic()
        average_steps = compute_all(mod.log)
        stop = time.monotonic()

        total_seconds = stop - start
        minutes = int(total_seconds // 60)
        seconds = round(total_seconds - 60 * minutes)

        print('Took {}m {}s ({} steps on average)'
              .format(minutes, seconds, round(average_steps)))


if __name__ == '__main__':
    main()
