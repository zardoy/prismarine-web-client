export const getSunlightLevel = (timeOfDay: number) => {
  if (timeOfDay > 13.670 && timeOfDay < 22.330) return 4
  if (timeOfDay > 22.33 && timeOfDay < 22.491) return 5
  // or 13,509–13,669
  if (timeOfDay > 13.508 && timeOfDay < 13.669) return 5
  // 22,492–22,652
  if (timeOfDay > 22.491 && timeOfDay < 22.652) return 6
  // or 13,348–13,508
  if (timeOfDay > 13.347 && timeOfDay < 13.508) return 6
  // 22,653–22,812‌
  if (timeOfDay > 22.652 && timeOfDay < 22.812) return 7
  // or 13,188–13,347
  if (timeOfDay > 13.187 && timeOfDay < 13.347) return 7
  // 22,813‌-22,973 or 13,027–13,187
  if (timeOfDay > 22.812 && timeOfDay < 22.973 || timeOfDay > 13.027 && timeOfDay < 13.187) {
    return 8
  }
  // 22,974–23,134 or 12,867–13,026
  if (timeOfDay > 22.973 && timeOfDay < 23.134 || timeOfDay > 12.867 && timeOfDay < 13.026) {
    return 9
  }
  // 23,135–23,296 or 12,705–12,866
  if (timeOfDay > 23.134 && timeOfDay < 23.296 || timeOfDay > 12.705 && timeOfDay < 12.866) {
    return 10
  }
  // 23,297–23,459 or 12,542–12,704
  if (timeOfDay > 23.296 && timeOfDay < 23.459 || timeOfDay > 12.542 && timeOfDay < 12.704) {
    return 11
  }
  // 23,460–23,623‌ or 12,377–12,541
  if (timeOfDay > 23.459 && timeOfDay < 23.623 || timeOfDay > 12.377 && timeOfDay < 12.541) {
    return 12
  }
  // 23,624–23,790 or 12,210–12,376
  if (timeOfDay > 23.623 && timeOfDay < 23.790 || timeOfDay > 12.210 && timeOfDay < 12.376) {
    return 13
  }
  // 23,791–23,960 or 12,041–12,209
  if (timeOfDay > 23.790 || timeOfDay < 12.041) {
    return 14
  }
  return 15
}
