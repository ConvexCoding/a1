enum MaterialType {
  ZnSe,
  FusedSilica,
  ZnS,
  Ge,
  GaAs,
  CdTe,
  BaF2,
  CaF2,
  Silicon,
  Diamond,
  Al2O3,
  PbF2,
  ThF4,
  MgF2,
  MgO,
  TiO2,
  As2S3,
  NaCl,
  KBr,
  KCl,
  CsI,
  CsBr,
  Se,
  AMTIR1,
  NaF2,
}

type IndexFnData = number[] | number[][]
type IndexCalcFn = (wlen: number, data: IndexFnData) => number

export default class Material {
  type: MaterialType
  minWlen: number // minimum valid wavelength for lookup tables
  maxWlen: number // maximum valid wavelength for lookup tables
  sourceLiterature: string // reference if known
  associatedData: IndexFnData // if Sellmeier is used, this is the 2d coefficient array, otherwise 3d lookup table
  calcFunc: IndexCalcFn // function to calculate the index

  constructor(
    type: MaterialType,
    minWlen: number,
    maxWlen: number,
    sourceLiterature: string,
    associatedData: IndexFnData,
    calcFunc: IndexCalcFn = lookupIndex
  ) {
    this.type = type
    this.minWlen = minWlen
    this.maxWlen = maxWlen
    this.sourceLiterature = sourceLiterature
    this.associatedData = associatedData
    this.calcFunc = calcFunc
  }

  nIndexAt(wavelength: number) {
    if (wavelength < this.minWlen || wavelength > this.maxWlen) {
      throw new Error(
        `Wavelength out of range for "${this.toString()}" (min: ${this.minWlen}, max: ${
          this.maxWlen
        })`
      )
    }
    return this.calcFunc(wavelength, this.associatedData)
  }

  get color(): string {
    switch (this.type) {
      case MaterialType.ZnSe:
        return '#FFA500'
      case MaterialType.FusedSilica:
        return '#ADD8E6'
      default:
        return '#eee'
    }
  }

  static fromString(s: string) {
    switch (s) {
      case 'ZnSe':
        return Material.ZnSe
      case 'FusedSilica':
        return Material.FusedSilica
      case 'ZnS':
        return Material.ZnS
      case 'Ge':
        return Material.Ge
      case 'GaAs':
        return Material.GaAs
      case 'CdTe':
        return Material.CdTe
      case 'BaF2':
        return Material.BaF2
      case 'CaF2':
        return Material.CaF2
      case 'Silicon':
        return Material.Silicon
      case 'Diamond':
        return Material.Diamond
      case 'Al2O3':
        return Material.Al2O3
      case 'PbF2':
        return Material.PbF2
      case 'ThF4':
        return Material.ThF4
      case 'MgF2':
        return Material.MgF2
      case 'MgO':
        return Material.MgO
      case 'TiO2':
        return Material.TiO2
      case 'As2S3':
        return Material.As2S3
      case 'NaCl':
        return Material.NaCl
      case 'KBr':
        return Material.KBr
      case 'KCl':
        return Material.KCl
      case 'CsI':
        return Material.CsI
      case 'CsBr':
        return Material.CsBr
      case 'Se':
        return Material.Se
      case 'AMTIR1':
        return Material.AMTIR1
      case 'NaF2':
        return Material.NaF2
      default:
        throw new Error(`Material not found: ${s}`)
    }
  }

  toString() {
    return MaterialType[this.type]
  }
  /*
  static get allMaterials() {
    return Object.values(MaterialType)
      .filter((n) => typeof n === 'string')
      .sort() as string[]
  }
*/
  static get ZnSe() {
    return new Material(
      MaterialType.ZnSe,
      0.5,
      22,
      'II-VI Researched',
      [4.3809835, 0.19656967, 0.5445451, 0.3854439, 2.889225, 47.0210925],
      sell1
    )
  }

  static get CdTe() {
    return new Material(
      MaterialType.CdTe,
      1.0,
      30.0,
      'Dodge and Malitson',
      [3.7575, 3.4632, 0.1866, 6.238, 9273.0],
      sell0
    )
  }

  static get BaF2() {
    return new Material(
      MaterialType.BaF2,
      0.1345,
      15.0,
      'Unknown',
      [0.643356, 0.057789, 0.506762, 0.10968, 3.8261, 46.3864],
      sell1
    )
  }

  static get CaF2() {
    return new Material(
      MaterialType.CaF2,
      0.125,
      12.0,
      'Unknown',
      [0.5675888, 0.050263605, 0.4710914, 0.1003909, 3.8484723, 34.64904],
      sell1
    )
  }

  static get Silicon() {
    return new Material(
      MaterialType.Silicon,
      1.36,
      11.0,
      'Handbook of Optics, 3rd edition, Vol. 4. McGraw-Hill 2009',
      [10.6684293, 0.301516485, 0.003043475, 1.13475115, 1.54133408, 1104.0],
      sell1
    )
  }

  static get Diamond() {
    return new Material(
      MaterialType.Diamond,
      0.225,
      100,
      'http://refractiveindex.info/?group=CRYSTALS&material=C',
      [4.3356, 0.106, 0.3306, 0.175],
      sell3
    )
  }

  static get GaAs() {
    return new Material(MaterialType.GaAs, 2.5, 14, 'Unknown', [
      [2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0],
      [
        3.3256, 3.3169, 3.3069, 3.301, 3.2963, 3.2923, 3.2878, 3.283, 3.277, 3.2725, 3.2666, 3.2589,
        3.2509,
      ],
    ])
  }

  static get Ge() {
    return new Material(MaterialType.Ge, 2.0581, 13.02, 'old Melles Groit catalogue', [
      [
        2.0581, 2.1526, 2.3126, 2.4374, 2.577, 2.7144, 2.998, 3.3033, 3.1488, 4.258, 4.866, 6.238,
        8.66, 9.72, 11.04, 12.2, 13.02,
      ],
      [
        4.1018, 4.0919, 4.0785, 4.0709, 4.0608, 4.0554, 4.0452, 4.0372, 4.0339, 4.0217, 4.0167,
        4.0095, 4.0043, 4.0033, 4.0025, 4.002, 4.0018,
      ],
    ])
  }

  static get ZnS() {
    return new Material(MaterialType.ZnS, 0.42, 18.2, 'Raytheon data, via M. J. Dodge', [
      [
        0.42, 0.46, 0.5, 0.54, 0.58, 0.62, 0.66, 0.7, 0.74, 0.78, 0.82, 0.86, 0.9, 0.94, 0.98, 1.0,
        1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8, 4.2, 4.6, 5.0, 5.4, 5.8, 6.2, 6.6, 7.0, 7.4, 7.8, 8.2,
        8.6, 9.0, 9.4, 9.8, 10.2, 10.6, 11.0, 11.4, 11.8, 12.2, 12.6, 13.0, 13.4, 13.8, 14.2, 14.6,
        15.0, 15.4, 15.8, 16.2, 16.6, 17.0, 17.4, 17.8, 18.2,
      ],
      [
        2.516, 2.458, 2.419, 2.391, 2.371, 2.355, 2.342, 2.332, 2.323, 2.316, 2.31, 2.305, 2.301,
        2.297, 2.294, 2.292, 2.257, 2.267, 2.263, 2.26, 2.257, 2.255, 2.253, 2.251, 2.248, 2.246,
        2.244, 2.241, 2.238, 2.235, 2.232, 2.228, 2.225, 2.221, 2.217, 2.212, 2.208, 2.203, 2.198,
        2.192, 2.186, 2.18, 2.173, 2.167, 2.159, 2.152, 2.143, 2.135, 2.126, 2.116, 2.106, 2.095,
        2.084, 2.072, 2.059, 2.045, 2.03, 2.015, 1.998,
      ],
    ])
  }

  static get Al2O3() {
    return new Material(
      MaterialType.Al2O3,
      0.2652,
      5.577,
      '(Sapphire) Optl. Matls. for IR Instr. or Optovac Catalogue ',
      [
        [
          0.2652, 0.2803, 0.2894, 0.2967, 0.3021, 0.313, 0.3341, 0.3466, 0.3611, 0.365, 0.3906,
          0.4047, 0.4358, 0.5461, 0.577, 0.5791, 0.6438, 0.7065, 0.8521, 0.8944, 1.014, 1.1287,
          1.3673, 1.3951, 1.5295, 1.6932, 1.7091, 1.8131, 1.9701, 2.1526, 2.2493, 2.3254, 2.4374,
          3.2432, 3.2666, 3.303, 3.3293, 3.4188, 3.5078, 3.7, 4.258, 4.954, 5.1456, 5.349, 5.419,
          5.577,
        ],
        [
          1.8336, 1.8243, 1.8195, 1.8159, 1.8135, 1.8091, 1.8018, 1.7981, 1.7945, 1.7936, 1.7884,
          1.7858, 1.7812, 1.7708, 1.7688, 1.7687, 1.7655, 1.763, 1.7588, 1.7579, 1.7555, 1.7534,
          1.7494, 1.7489, 1.7466, 1.7437, 1.7434, 1.7414, 1.7383, 1.7344, 1.7323, 1.7306, 1.7278,
          1.7044, 1.7036, 1.7023, 1.7015, 1.6982, 1.695, 1.6875, 1.6637, 1.6266, 1.6151, 1.602,
          1.5973, 1.5864,
        ],
      ]
    )
  }

  static get PbF2() {
    return new Material(MaterialType.PbF2, 0.2909, 11.862, 'Harshaw catalogue', [
      [
        0.2909, 0.2967, 0.3022, 0.3351, 0.365, 0.3663, 0.4047, 0.4358, 0.4678, 0.48, 0.5086, 0.5461,
        0.577, 0.579, 0.5876, 0.6438, 0.6678, 0.7065, 0.8521, 0.8944, 1.014, 1.083, 1.129, 1.36,
        1.395, 1.47, 1.53, 1.693, 1.714, 1.813, 1.97, 2.325, 2.577, 2.574, 3.244, 3.267, 6.412,
        6.708, 6.787, 7.388, 11.035, 11.475, 11.862,
      ],
      [
        1.9722, 1.9471, 1.9299, 1.8704, 1.8408, 1.8398, 1.8156, 1.8016, 1.7907, 1.7873, 1.7802,
        1.7729, 1.768, 1.7677, 1.7665, 1.7599, 1.7577, 1.7545, 1.7463, 1.7447, 1.7411, 1.7395,
        1.7387, 1.7352, 1.7348, 1.734, 1.7334, 1.7321, 1.7319, 1.7312, 1.7301, 1.7279, 1.7262,
        1.7258, 1.7221, 1.7219, 1.6929, 1.6892, 1.6882, 1.6802, 1.6155, 1.6058, 1.5969,
      ],
    ])
  }

  static get ThF4() {
    return new Material(
      MaterialType.ThF4,
      0.3,
      25.0,
      'M. Bob, Various Guestimates collected from articles',
      [
        [0.3, 3.8, 5.3, 10.6, 14.0, 16.0, 25.0],
        [1.58, 1.5, 1.49, 1.35, 1.32, 1.3, 1.28],
      ]
    )
  }

  static get MgF2() {
    return new Material(MaterialType.MgF2, 1, 9, 'Kodak Flyer', [
      [
        1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0,
        5.25, 5.5, 5.75, 6.0, 6.25, 6.5, 6.75, 7.0, 7.25, 7.5, 7.75, 8.0, 8.25, 8.5, 8.75, 9.0,
      ],
      [
        1.3778, 1.3763, 1.3794, 1.3735, 1.372, 1.3702, 1.3683, 1.3663, 1.364, 1.3614, 1.3587,
        1.3558, 1.3526, 1.3492, 1.3455, 1.3416, 1.3374, 1.3329, 1.3282, 1.3232, 1.3179, 1.3122,
        1.3063, 1.3, 1.2934, 1.2865, 1.2792, 1.2715, 1.2634, 1.2549, 1.246, 1.2367, 1.2269,
      ],
    ])
  }

  static get MgO() {
    return new Material(MaterialType.MgO, 0.3612, 9.0, 'Optl. Matls. for IR Instr. and Kodak', [
      [
        0.3612, 0.365, 1.0, 1.014, 1.1287, 1.25, 1.3673, 1.5, 1.5295, 1.6932, 1.7092, 1.75, 1.8131,
        1.9701, 2.0, 2.2493, 2.25, 2.3254, 2.5, 2.75, 3.0, 3.25, 3.3033, 3.5, 3.5078, 3.75, 4.0,
        4.25, 4.258, 4.5, 4.75, 5.0, 5.138, 5.25, 5.35, 5.5, 5.75, 6.0, 6.25, 6.5, 6.75, 7.0, 7.25,
        7.5, 7.75, 8.0, 8.25, 8.5, 8.75, 9.0,
      ],
      [
        1.7732, 1.7719, 1.7227, 1.7226, 1.7206, 1.7188, 1.7171, 1.7156, 1.715, 1.7128, 1.7126,
        1.7123, 1.7111, 1.7088, 1.7089, 1.7047, 1.7052, 1.7035, 1.7012, 1.6968, 1.692, 1.6868,
        1.6853, 1.6811, 1.6805, 1.675, 1.6684, 1.6612, 1.6604, 1.6536, 1.6455, 1.6368, 1.6314,
        1.6275, 1.624, 1.6177, 1.6072, 1.5962, 1.5845, 1.5721, 1.559, 1.5452, 1.5307, 1.5154,
        1.4993, 1.4824, 1.4646, 1.446, 1.4265, 1.406,
      ],
    ])
  }

  static get TiO2() {
    return new Material(MaterialType.TiO2, 0.4358, 5.5, 'Optovac Catalogue', [
      [
        0.4358, 0.4916, 0.496, 0.5461, 0.577, 0.5791, 0.6907, 0.7082, 1.014, 1.5296, 2.0, 2.5, 3.0,
        3.5, 4.0, 4.5, 5.0, 5.5,
      ],
      [
        2.853, 2.723, 2.715, 2.652, 2.623, 2.621, 2.555, 2.548, 2.483, 2.451, 2.399, 2.387, 2.38,
        2.367, 2.35, 2.322, 2.29, 2.2,
      ],
    ])
  }

  static get As2S3() {
    return new Material(MaterialType.As2S3, 0.577, 11.862, 'Optl. Matls. for IR Instr.', [
      [
        0.577, 0.579, 0.5876, 0.6439, 0.6678, 0.6908, 0.7065, 0.8521, 0.8944, 1.014, 1.1287, 1.3951,
        1.5295, 1.7006, 1.8131, 1.9701, 3.4188, 4.258, 5.138, 6.238, 6.692, 8.662, 9.724, 11.035,
        11.475, 11.862,
      ],
      [
        2.6632, 2.6605, 2.6501, 2.5976, 2.5808, 2.567, 2.5586, 2.5061, 2.4963, 2.4757, 2.4623,
        2.4438, 2.438, 2.4326, 2.43, 2.4268, 2.4137, 2.4101, 2.4067, 2.4022, 2.1003, 2.3903, 2.3834,
        2.3736, 2.3694, 2.3658,
      ],
    ])
  }

  static get FusedSilica() {
    return new Material(MaterialType.FusedSilica, 0.34, 3.5, 'Unknown', [
      [
        0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48,
        0.49, 0.5, 0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.6, 0.61, 0.62, 0.63,
        0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7,
        1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5,
      ],
      [
        1.4788, 1.477, 1.4754, 1.4739, 1.4726, 1.4713, 1.4702, 1.4691, 1.4682, 1.4673, 1.4664,
        1.4656, 1.4649, 1.4642, 1.4636, 1.463, 1.4624, 1.4619, 1.4613, 1.4609, 1.4604, 1.46, 1.4596,
        1.4592, 1.4588, 1.4584, 1.4581, 1.4578, 1.4575, 1.4572, 1.4569, 1.4566, 1.4563, 1.4561,
        1.4558, 1.4556, 1.4553, 1.4534, 1.4518, 1.4505, 1.4493, 1.4481, 1.447, 1.4458, 1.4447,
        1.4435, 1.4422, 1.4409, 1.4396, 1.4382, 1.4367, 1.4351, 1.4335, 1.4317, 1.4299, 1.428,
        1.426, 1.4239, 1.4217, 1.4194, 1.4169, 1.4144, 1.4117, 1.4089, 1.406,
      ],
    ])
  }

  static get NaCl() {
    return new Material(MaterialType.NaCl, 0.5, 22.3, 'Optovac Catalogue and Optl.Matl.for IR', [
      [
        0.5, 0.589, 0.64, 0.6874, 0.7604, 0.7858, 0.8835, 0.9033, 0.9724, 1.0, 1.0084, 1.054, 1.081,
        1.1058, 1.142, 1.1486, 1.2016, 1.2604, 1.3126, 1.4874, 1.5552, 1.6368, 1.6848, 1.767, 2.0,
        2.0736, 2.1824, 2.2464, 2.356, 2.6505, 2.9466, 3.0, 3.2736, 3.5359, 3.6288, 3.8192, 4.0,
        4.123, 4.712, 5.0, 5.0092, 5.3009, 5.8932, 6.0, 6.4825, 6.8, 7.0, 7.0718, 7.22, 7.59,
        7.6611, 7.9558, 8.0, 8.04, 8.8398, 9.0, 9.5, 10.0, 10.0184, 11.0, 11.7864, 12.5, 12.965,
        13.0, 14.1436, 14.733, 15.3223, 15.9116, 17.93, 20.57, 22.3,
      ],
      [
        1.544, 1.5443, 1.5414, 1.5393, 1.5368, 1.5361, 1.5339, 1.5336, 1.5325, 1.532, 1.5321,
        1.5315, 1.5312, 1.531, 1.5306, 1.5303, 1.5301, 1.5297, 1.5294, 1.5284, 1.5281, 1.5278,
        1.5276, 1.5274, 1.527, 1.5265, 1.5262, 1.5261, 1.5258, 1.5251, 1.5247, 1.523, 1.5237,
        1.5231, 1.5229, 1.5224, 1.521, 1.5216, 1.5198, 1.519, 1.5188, 1.5179, 1.5159, 1.515, 1.5135,
        1.512, 1.51, 1.5109, 1.5102, 1.5085, 1.5082, 1.5066, 1.506, 1.5064, 1.5019, 1.501, 1.4998,
        1.495, 1.4946, 1.488, 1.4817, 1.4757, 1.4716, 1.4666, 1.4604, 1.4543, 1.4474, 1.4409,
        1.4149, 1.3735, 1.3403,
      ],
    ])
  }

  static get KBr() {
    return new Material(MaterialType.KBr, 0.4047, 25.14, 'Unknown', [
      [
        0.4047, 0.4358, 0.4861, 0.5086, 0.5461, 0.5876, 0.6438, 0.7065, 1.014, 1.1287, 1.3673,
        1.7012, 2.44, 2.73, 3.419, 4.258, 6.238, 6.692, 8.662, 9.724, 11.035, 11.862, 14.29, 14.98,
        17.4, 18.16, 19.01, 19.91, 21.18, 21.83, 23.86, 25.14,
      ],
      [
        1.5898, 1.5815, 1.5718, 1.5685, 1.5639, 1.56, 1.5559, 1.5524, 1.5441, 1.5426, 1.5406, 1.539,
        1.5373, 1.5369, 1.5361, 1.5352, 1.5329, 1.5322, 1.529, 1.5269, 1.524, 1.522, 1.515, 1.5128,
        1.5039, 1.5008, 1.497, 1.4929, 1.4865, 1.4831, 1.4714, 1.4632,
      ],
    ])
  }

  static get KCl() {
    return new Material(MaterialType.KCl, 0.21, 18.8, 'Unknown', [
      [0.21, 0.5, 1.2, 2.3573, 4.7, 5.3039, 10.184, 14.1, 15.912, 18.1, 18.8],
      [1.72, 1.49, 1.48, 1.4747, 1.47, 1.47, 1.4567, 1.44, 1.4262, 1.41, 1.401],
    ])
  }

  static get CsI() {
    return new Material(MaterialType.CsI, 0.5, 50.0, 'Unknown', [
      [
        0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0,
        17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0,
        32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0, 39.0, 40.0, 41.0, 42.0, 43.0, 44.0, 45.0, 46.0,
        47.0, 48.0, 49.0, 50.0,
      ],
      [
        1.8063, 1.7572, 1.7462, 1.744, 1.743, 1.7424, 1.7418, 1.7412, 1.7406, 1.7399, 1.7392,
        1.7383, 1.7375, 1.7365, 1.7355, 1.7344, 1.7332, 1.7319, 1.7306, 1.7291, 1.7276, 1.726,
        1.7243, 1.7226, 1.7207, 1.7188, 1.7168, 1.7146, 1.7124, 1.7101, 1.7077, 1.7052, 1.7027, 1.7,
        1.6972, 1.6943, 1.6913, 1.6881, 1.6849, 1.6816, 1.6781, 1.6746, 1.6709, 1.6671, 1.6631,
        1.659, 1.6548, 1.6505, 1.646, 1.6414, 1.6366,
      ],
    ])
  }

  static get CsBr() {
    return new Material(MaterialType.CsBr, 0.5, 39.0, 'Unknown', [
      [
        0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0,
        17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0,
        32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0, 39.0,
      ],
      [
        1.709, 1.6779, 1.6706, 1.669, 1.6681, 1.6674, 1.6666, 1.6657, 1.6648, 1.6637, 1.6625,
        1.6612, 1.6598, 1.6582, 1.6565, 1.6547, 1.6527, 1.6506, 1.6484, 1.646, 1.6435, 1.6408,
        1.638, 1.635, 1.6319, 1.6286, 1.6251, 1.6215, 1.6176, 1.1636, 1.6095, 1.6051, 1.6005,
        1.5958, 1.5908, 1.5856, 1.5802, 1.5745, 1.5686, 1.5624,
      ],
    ])
  }

  static get Se() {
    return new Material(MaterialType.Se, 2.5, 15.0, 'Unknown', [
      [2.5, 5.0, 15.0],
      [2.45, 2.42, 2.38],
    ])
  }

  static get AMTIR1() {
    return new Material(MaterialType.AMTIR1, 1.0, 14.0, 'Amorphous Materials Catalogue', [
      [1.0, 1.064, 1.5, 2.0, 2.4, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0],
      [
        2.6055, 2.5933, 2.5469, 2.531, 2.525, 2.5187, 2.5141, 2.5109, 2.508, 2.5057, 2.5034, 2.5005,
        2.4976, 2.4936, 2.4904, 2.485, 2.4825,
      ],
    ])
  }

  static get NaF2() {
    return new Material(MaterialType.NaF2, 0.186, 17.3, 'Unknown', [
      [
        0.186, 0.199, 0.203, 0.302, 0.405, 0.486, 0.546, 0.589, 0.707, 0.811, 0.912, 1.014, 2.0,
        3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.3, 11.3, 12.5, 13.8, 15.1, 16.7, 17.3,
      ],
      [
        1.393, 1.3805, 1.3772, 1.3423, 1.3319, 1.3282, 1.3264, 1.3255, 1.3237, 1.3227, 1.322,
        1.3215, 1.317, 1.313, 1.308, 1.301, 1.292, 1.281, 1.269, 1.262, 1.233, 1.209, 1.18, 1.142,
        1.093, 1.034, 1.0,
      ],
    ])
  }
}

function lookupIndex(w: number, table: number[][]) {
  for (let i = 0; i < table[0].length; i++) {
    if (w >= table[0][i] && w <= table[0][i + 1]) {
      return (
        table[1][i] +
        ((table[1][i + 1] - table[1][i]) / (table[0][i + 1] - table[0][i])) * (w - table[0][i])
      )
    }
  }
  throw new Error(`Could not determine index from table for wavelength ${w}`)
}

// CdTe
function sell0(w: number, sell0: number[]) {
  return Math.sqrt(
    sell0[0] + (sell0[1] * w ** 2) / (w ** 2 - sell0[2]) + (sell0[3] * w ** 2) / (w ** 2 - sell0[4])
  )
}

// ZnSe, BaF2, CaF2, Silicon
function sell1(w: number, sell1: number[]) {
  return Math.sqrt(
    1.0 +
      (sell1[0] * w ** 2) / (w ** 2 - sell1[1] * sell1[1]) +
      (sell1[2] * w ** 2) / (w ** 2 - sell1[3] * sell1[3]) +
      (sell1[4] * w ** 2) / (w ** 2 - sell1[5] * sell1[5])
  )
}

// legacy function used with silicon but is now obsolete
function sell2(w: number, sell2: number[]) {
  return (
    sell2[0] +
    sell2[1] / (w ** 2 - sell2[5]) +
    sell2[2] / ((w ** 2 - sell2[5]) * (w ** 2 - sell2[5])) +
    sell2[3] * w ** 2 +
    sell2[4] * w ** 4
  )
}

// Diamond
function sell3(w: number, sell3: number[]) {
  return Math.sqrt(
    1.0 +
      (sell3[0] * w * w) / (w * w - sell3[1] * sell3[1]) +
      (sell3[2] * w * w) / (w * w - sell3[3] * sell3[3])
  )
}
