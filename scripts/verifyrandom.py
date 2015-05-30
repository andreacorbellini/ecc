#!/usr/bin/env python3

import collections
import hashlib


class VerificationFailed(Exception):

    pass


EllipticCurve = collections.namedtuple('EllipticCurve', 'seed p a b')


# All the following curves except the last one were taken from the OpenSSL
# source code (crypto/ec/ec_curve.c). The last four are fake curves that should
# not pass seed validation.

curves = {
    'prime192v1': EllipticCurve(
        seed=0x3045ae6fc8422f64ed579528d38120eae12196d5,
        p=0xfffffffffffffffffffffffffffffffeffffffffffffffff,
        a=0xfffffffffffffffffffffffffffffffefffffffffffffffc,
        b=0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1,
    ),
    'secp224r1': EllipticCurve(
        seed=0xbd71344799d5c7fcdc45b59fa3b9ab8f6a948bc5,
        p=0xffffffffffffffffffffffffffffffff000000000000000000000001,
        a=0xfffffffffffffffffffffffffffffffefffffffffffffffffffffffe,
        b=0xb4050a850c04b3abf54132565044b0b7d7bfd8ba270b39432355ffb4,
    ),
    'secp384r1': EllipticCurve(
        seed=0xa335926aa319a27a1d00896a6773a4827acdac73,
        p=0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff,
        a=0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc,
        b=0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef,
    ),
    'secp521r1': EllipticCurve(
        seed=0xd09e8800291cb85396cc6717393284aaa0da64ba,
        p=0x01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
        a=0x01fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc,
        b=0x0051953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00,
    ),
    'prime192v2': EllipticCurve(
        seed=0x31a92ee2029fd10d901b113e990710f0d21ac6b6,
        p=0xfffffffffffffffffffffffffffffffeffffffffffffffff,
        a=0xfffffffffffffffffffffffffffffffefffffffffffffffc,
        b=0xcc22d6dfb95c6b25e49c0d6364a4e5980c393aa21668d953,
    ),
    'prime192v3': EllipticCurve(
        seed=0xc469684435deb378c4b65ca9591e2a5763059a2e,
        p=0xfffffffffffffffffffffffffffffffeffffffffffffffff,
        a=0xfffffffffffffffffffffffffffffffefffffffffffffffc,
        b=0x22123dc2395a05caa7423daeccc94760a7d462256bd56916,
    ),
    'prime239v1': EllipticCurve(
        seed=0xe43bb460f0b80cc0c0b075798e948060f8321b7d,
        p=0x7fffffffffffffffffffffff7fffffffffff8000000000007fffffffffff,
        a=0x7fffffffffffffffffffffff7fffffffffff8000000000007ffffffffffc,
        b=0x6b016c3bdcf18941d0d654921475ca71a9db2fb27d1d37796185c2942c0a,
    ),
    'prime239v2': EllipticCurve(
        seed=0xe8b4011604095303ca3b8099982be09fcb9ae616,
        p=0x7fffffffffffffffffffffff7fffffffffff8000000000007fffffffffff,
        a=0x7fffffffffffffffffffffff7fffffffffff8000000000007ffffffffffc,
        b=0x617fab6832576cbbfed50d99f0249c3fee58b94ba0038c7ae84c8c832f2c,
    ),
    'prime239v3': EllipticCurve(
        seed=0x7d7374168ffe3471b60a857686a19475d3bfa2ff,
        p=0x7fffffffffffffffffffffff7fffffffffff8000000000007fffffffffff,
        a=0x7fffffffffffffffffffffff7fffffffffff8000000000007ffffffffffc,
        b=0x255705fa2a306654b1f4cb03d6a750a30c250102d4988717d9ba15ab6d3e,
    ),
    'prime256v1': EllipticCurve(
        seed=0xc49d360886e704936a6678e1139d26b7819f7e90,
        p=0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff,
        a=0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc,
        b=0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b,
    ),
    'secp112r1': EllipticCurve(
        seed=0x00f50b028e4d696e676875615175290472783fb1,
        p=0xdb7c2abf62e35e668076bead208b,
        a=0xdb7c2abf62e35e668076bead2088,
        b=0x659ef8ba043916eede8911702b22,
    ),
    'secp112r2': EllipticCurve(
        seed=0x002757a1114d696e6768756151755316c05e0bd4,
        p=0xdb7c2abf62e35e668076bead208b,
        a=0x6127c24c05f38a0aaaf65c0ef02c,
        b=0x51def1815db5ed74fcc34c85d709,
    ),
    'secp128r1': EllipticCurve(
        seed=0x000e0d4d696e6768756151750cc03a4473d03679,
        p=0xfffffffdffffffffffffffffffffffff,
        a=0xfffffffdfffffffffffffffffffffffc,
        b=0xe87579c11079f43dd824993c2cee5ed3,
    ),
    'secp128r2': EllipticCurve(
        seed=0x004d696e67687561517512d8f03431fce63b88f4,
        p=0xfffffffdffffffffffffffffffffffff,
        a=0xd6031998d1b3bbfebf59cc9bbff9aee1,
        b=0x5eeefca380d02919dc2c6558bb6d8a5d,
    ),
    'secp160r1': EllipticCurve(
        seed=0x1053cde42c14d696e67687561517533bf3f83345,
        p=0x00ffffffffffffffffffffffffffffffff7fffffff,
        a=0x00ffffffffffffffffffffffffffffffff7ffffffc,
        b=0x001c97befc54bd7a8b65acf89f81d4d4adc565fa45,
    ),
    'secp160r2': EllipticCurve(
        seed=0xb99b99b099b323e02709a4d696e6768756151751,
        p=0x00fffffffffffffffffffffffffffffffeffffac73,
        a=0x00fffffffffffffffffffffffffffffffeffffac70,
        b=0x00b4e134d3fb59eb8bab57274904664d5af50388ba,
    ),
    # This is prime192v1 with a wrong value for seed.
    'wrong192v1': EllipticCurve(
        seed=0x123,
        p=0xfffffffffffffffffffffffffffffffeffffffffffffffff,
        a=0xfffffffffffffffffffffffffffffffefffffffffffffffc,
        b=0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1,
    ),
    # This is prime192v1 with a wrong value for p.
    'wrong192v2': EllipticCurve(
        seed=0x3045ae6fc8422f64ed579528d38120eae12196d5,
        p=0x123,
        a=0xfffffffffffffffffffffffffffffffefffffffffffffffc,
        b=0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1,
    ),
    # This is prime192v1 with a wrong value for a.
    'wrong192v3': EllipticCurve(
        seed=0x3045ae6fc8422f64ed579528d38120eae12196d5,
        p=0xfffffffffffffffffffffffffffffffeffffffffffffffff,
        a=0x123,
        b=0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1,
    ),
    # This is prime192v1 with a wrong value for b.
    'wrong192v4': EllipticCurve(
        seed=0x3045ae6fc8422f64ed579528d38120eae12196d5,
        p=0xfffffffffffffffffffffffffffffffeffffffffffffffff,
        a=0xfffffffffffffffffffffffffffffffefffffffffffffffc,
        b=0x123,
    ),
}


def verify_curve(curve):
    """
    Verifies whether the a and b parameters of the given curve were generated
    from the seed.

    Raises a VerificationFailed exception in case the verification fails.
    """
    # What follows is the implementation of the verification algorithm
    # described in "The Elliptic Curve Digital Signature Algorithm (ECDSA)",
    # from Certicom. There just a few difference between the original algorithm
    # and the implementation:
    #
    # * a few variable names have been changed for the sake of clarity;
    # * the document from Certicom allows arbritrary seeds with bit length
    #   >= 160; here we only care about seeds that are exactly 160-bit long.

    if curve.seed.bit_length() > 160:
        raise VerificationFailed('seed too long')

    seed_bytes = curve.seed.to_bytes(length=160 // 8, byteorder='big')

    # Define t, s and v as specified on the document.
    t = curve.p.bit_length()
    s = (t - 1) // 160
    v = t - 160 * s

    # 1. Compute h = SHA-1(seed_bytes) and let c0 denote the bit string of
    #    length v bits obtained by taking the v rightmost bits of h.
    h = hashlib.sha1(seed_bytes).digest()
    h = int.from_bytes(h, byteorder='big')

    c0 = h & ((1 << v) - 1)

    # 2. Let w[0] denote the bit string of length v bits obtained by setting
    #    the leftmost bit of c0 to 0.
    #
    # Note: here we use 160 bit instead of v bits, as required by the document.
    # We do so to make the code easier, and because it does not make any
    # difference (see the step 6).
    w0 = c0 & ((1 << v - 1) - 1)
    w = [w0.to_bytes(length=160 // 8, byteorder='big')]

    # 3. Let z be the integer whose binary expansion is given by 160-bit string
    #    seed_bytes.
    z = curve.seed

    # 4. For i from 1 to s do:
    for i in range(1, s + 1):
        # 4.1 Let s_i be 160-bit string which is the binary expansion of the
        #     integer (z + i) % (2 ** g).
        z_i = ((z + i) % (2 ** 160))
        s_i = z_i.to_bytes(length=160 // 8, byteorder='big')

        # 4.2 Compute w_i = SHA-1(s_i).
        w_i = hashlib.sha1(s_i).digest()
        w.append(w_i)

    # 5. Let w be the bit string obtained by concatenating w_0,w_1,...,w_s.
    w = b''.join(w)

    # 6. Let c be the integer whose integer expansion is given by w.
    #
    # On step 2, we said that we used a longer bit length for the first element
    # of w. This is correct because the resulting c does not change: using 160
    # bits instead of v bits is equivalent to add some zeroes to the left of c.
    c = int.from_bytes(w, 'big')

    # If b ** 2 * c == a ** 3 (mod p) then accept; otherwise reject.
    if (curve.b * curve.b * c - curve.a * curve.a * curve.a) % curve.p != 0:
        raise VerificationFailed('curve verification failed')


# Check all the curves defined above.
# Should produce the following output:
#
#     prime192v1: ok
#     prime192v2: ok
#     ...
#     secp384r1: ok
#     secp521r1: ok
#     wrong192v1: failed
#     wrong192v2: failed
#     wrong192v3: failed
#     wrong192v4: failed
for name in sorted(curves):
    curve = curves[name]
    print(name, end=': ')
    try:
        verify_curve(curve)
    except VerificationFailed:
        print('failed')
    else:
        print('ok')
