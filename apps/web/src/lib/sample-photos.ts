// 시안·예시용 Unsplash 사진 (Unsplash License). 실제 서비스에서는 커플이 찍은 투어 사진만 쓴다.
// 출처: unsplash.com/photos/{7K67WDBrcIs, aRQrz0fclB8, xMDo8y776uE, m_CaYs0abOE, K8KiCHh4WU4, 464ps_nOflw}
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

export const SAMPLE_PHOTOS = {
  ballroom: u("1761110787206-2cc164e4913c"),
  flowerArch: u("1670529776180-60e4132ab90c"),
  garden: u("1607861884586-c7cfaed16290"),
  hall: u("1763429338698-439aa108e7fb"),
  gazebo: u("1523438885200-e635ba2c371e"),
  studio: u("1520854221256-17451cc331bf"),
} as const;
