export const EYE_ART =
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣀⣀⣀\n⠀⠀⠀⠀⠀⠀⠀⣀⡤⠴⠒⢚⣉⣭⠭⠴⠶⠶⠶⠶⠶⠶⠬⣭⣍⣙⠒⠲⠤⣄⡀\n⠀⠀⠀⣀⠴⠚⠉⠀⢀⣤⠞⠋⠉⠀⣀⣠⣤⣤⣤⣤⣤⣤⣀⡀⠀⠉⠛⢶⣄⠀⠈⠙⠲⢄⡀\n⠀⣠⠊⠁⠀⠀⠀⢠⡟⠁⠀⠀⣰⣾⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠙⣧⠀⠀⠀⠀⠉⢢⡀\n⠉⠳⡀⠀⠀⠀⠀⠸⣧⠀⠀⠀⢻⣿⣶⣶⣶⣾⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀⢠⡿⠀⠀⠀⠀⠀⡰⠊\n⠀⠀⠈⠓⢤⣀⠀⠀⠙⠷⣄⡀⠀⠈⠛⠻⠿⠿⠿⠿⠿⠿⠛⠋⠀⠀⣀⣴⠟⠁⠀⢀⣠⠔⠋\n⠀⠀⠀⠀⠀⠈⠉⠒⠦⢤⣈⣙⠛⠶⠦⢤⣤⣤⣤⣤⣤⣤⠤⠶⠒⢋⣉⣠⠤⠖⠊⠉\n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠙⠒⠒⠒⠒⠒⠒⠒⠚⠉⠉⠉'

const runFrames = [
  '   O    \n  /|\\   \n  / \\   ',
  '   O    \n  /|\\   \n  |\\    ',
  '   O    \n  \\|/   \n  / \\   ',
  '   O    \n  /|\\   \n   /\\   ',
]

const catFrames = [
  ' /\\_/\\  \n( o.o ) \n > ^ <  ',
  ' /\\_/\\  \n( -.- ) \n > ^ <  ',
  ' /\\_/\\  \n( o.o )~\n > ^ <  ',
]

const waveFrames = [
  '  ~~~~        ~~~~         ~~~~   \n><>   ~~    ~~    ~~     ~~    ~~ \n        ~~~~        ~~~~~        ~',
  ' ~~~~        ~~~~         ~~~~    \n~  ><>~    ~~    ~~     ~~    ~~  \n       ~~~~        ~~~~~        ~~',
  '~~~~        ~~~~         ~~~~     \n    ~~><> ~~    ~~     ~~    ~~   \n      ~~~~        ~~~~~        ~~~',
  '~~~        ~~~~         ~~~~      \n   ~~    ><>   ~~     ~~    ~~    \n     ~~~~        ~~~~~        ~~~~',
  '~~        ~~~~         ~~~~       \n  ~~    ~~ ><>  ~~     ~~    ~~   \n    ~~~~        ~~~~~        ~~~~ ',
  '~        ~~~~         ~~~~        \n ~~    ~~    ~~><>~~     ~~    ~~ \n   ~~~~        ~~~~~        ~~~~  ',
]

export const ANIMATIONS: Record<string, string[]> = {
  run: runFrames,
  cat: catFrames,
  wave: waveFrames,
}

export const HACKER_SOURCE = `#include <net/inet_sock.h>
#include <crypto/aes.h>
#include <vault/phosphor.h>

static u8 session_key[AES_KEYSIZE_256];
static struct socket *uplink;

static int spoof_ttl(struct sk_buff *skb, u8 ttl) {
  struct iphdr *ip = ip_hdr(skb);
  if (!ip) return -EINVAL;
  ip->ttl = ttl;
  ip->check = 0;
  ip->check = ip_fast_csum((u8 *)ip, ip->ihl);
  return 0;
}

static int handshake(const char *host, u16 port) {
  struct sockaddr_in addr = { .sin_family = AF_INET };
  int err = sock_create(AF_INET, SOCK_STREAM, IPPROTO_TCP, &uplink);
  if (err < 0) return err;
  addr.sin_port = htons(port);
  addr.sin_addr.s_addr = in_aton(host);
  pr_info("s-dos: tunneling to %s:%u\\n", host, port);
  return uplink->ops->connect(uplink, (struct sockaddr *)&addr,
                              sizeof(addr), O_NONBLOCK);
}

static void derive_key(const u8 *seed, size_t len) {
  struct crypto_shash *tfm = crypto_alloc_shash("sha256", 0, 0);
  SHASH_DESC_ON_STACK(desc, tfm);
  desc->tfm = tfm;
  crypto_shash_digest(desc, seed, len, session_key);
  crypto_free_shash(tfm);
  memzero_explicit((void *)seed, len);
}

static int sweep_sector(struct vault_dev *dev, sector_t lba) {
  struct bio *bio = bio_alloc(dev->bdev, 1, REQ_OP_READ, GFP_KERNEL);
  bio->bi_iter.bi_sector = lba;
  bio->bi_end_io = sector_leaked;
  submit_bio(bio);
  return atomic_inc_return(&dev->sectors_owned);
}

int inject_payload(struct vault_dev *dev) {
  u64 offset = 0x7ffe0000;
  int hops;
  derive_key(dev->entropy, sizeof(dev->entropy));
  for (hops = 0; hops < 64; hops++) {
    if (handshake("10.19.85.1", 5150 + hops) == 0) break;
    offset ^= rol64(offset, hops & 31);
  }
  pr_warn("s-dos: perimeter breached at 0x%llx\\n", offset);
  return sweep_sector(dev, offset >> 9);
}

MODULE_LICENSE("GPL");
MODULE_AUTHOR("guest");
MODULE_DESCRIPTION("drive S: perimeter audit");
`
