using System;
using System.Collections.Generic;
using System.Linq;
using EStable.Constants;
using EStable.Controllers;

namespace EStable.Models.Wizard
{
    public class ChargeTypesWizard : StableWizardBase
    {
        public List<StableChargeType> StableChargeTypes { get; set; }
        public List<StandardCharge> StandardChargeTypes { get; set; }

        public ChargeTypesWizard()
        {
            
        }

        public ChargeTypesWizard(string stableType)
        {
            #region SetDefaultChargeTypes

            switch (stableType)
            {
                case Codes.StableType.Greyhound:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType(1, "Full Training","$","Daily",true),
                            new StableChargeType(2, "Pre-Training","$","Daily",true),
                            new StableChargeType(3, "Spelling","$","Daily",true),
                            new StableChargeType(4, "Grazing","$","Daily",true),
                            new StableChargeType(5, "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge(1, "Track Fees","$"),
                            new StandardCharge(2, "Vitamins","$")
                        };
                    break;
                case Codes.StableType.Pacer:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType(1, "Full Training","$","Daily",true),
                            new StableChargeType(2, "Pre-Training","$","Daily",true),
                            new StableChargeType(3, "Spelling","$","Daily",true),
                            new StableChargeType(4, "Grazing","$","Daily",true),
                            new StableChargeType(5, "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge(1, "Track Fees","$"),
                            new StandardCharge(2, "Vitamins","$")
                        };
                    break;
                case Codes.StableType.Thoroughbred:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType(1, "Full Training","$","Daily",true),
                            new StableChargeType(2, "Pre-Training","$","Daily",true),
                            new StableChargeType(3, "Spelling","$","Daily",true),
                            new StableChargeType(4, "Grazing","$","Daily",true),
                            new StableChargeType(5, "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge(1, "Track Fees","$"),
                            new StandardCharge(2, "Vitamins","$")
                        };
                    break;
                case Codes.StableType.Trotter:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType(1, "Full Training","$","Daily",true),
                            new StableChargeType(2, "Pre-Training","$","Daily",true),
                            new StableChargeType(3, "Spelling","$","Daily",true),
                            new StableChargeType(4, "Grazing","$","Daily",true),
                            new StableChargeType(5, "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge(1, "Track Fees","$"),
                            new StandardCharge(2, "Vitamins","$")
                        };
                    break;
                default:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType(1, "Full Training","$","Daily",true),
                            new StableChargeType(2, "Pre-Training","$","Daily",true),
                            new StableChargeType(3, "Spelling","$","Daily",true),
                            new StableChargeType(4, "Grazing","$","Daily",true),
                            new StableChargeType(5, "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge(1, "Track Fees","$"),
                            new StandardCharge(2, "Vitamins","$")
                        };
                    break;
            }
            #endregion
        }

        public void AddStableChargeType(StableChargeType stableChargeType)
        {
            stableChargeType.StableChargeTypeId = StableChargeTypes.Count + 1;
            StableChargeTypes.Add(stableChargeType);
        }

        public void AddStandardChargeType(StandardCharge standardCharge)
        {
            standardCharge.StandardChargeId = StableChargeTypes.Count;
            StandardChargeTypes.Add(standardCharge);
        }

        public void AddStableChargeTypes(List<StableChargeType> chargeTypes)
        {
            chargeTypes.ForEach(AddStableChargeType);
        }

        public void AddStandardChargeTypes(List<StandardCharge> chargeTypes)
        {
            chargeTypes.ForEach(AddStandardChargeType);
        }

        public void SaveStableChargeTypeUnit(string id, string unit)
        {
            var charge = StableChargeTypes.SingleOrDefault(ch => ch.StableChargeTypeId.ToString() == id);
            if (charge != null)
            {
                charge.ChargingUnit = unit;
            }
            else
            {
                throw new ArgumentOutOfRangeException();
            }
        }

        public void SaveStableChargeTypeInstable(string id, bool instable)
        {
            var charge = StableChargeTypes.SingleOrDefault(ch => ch.StableChargeTypeId.ToString() == id);
            if (charge != null)
            {
                charge.InStable = instable;
            }
            else
            {
                throw new ArgumentOutOfRangeException();
            }
        }

        public void SaveStableChargeTypeDescription(string id, string description)
        {
            var charge = StableChargeTypes.SingleOrDefault(ch => ch.StableChargeTypeId.ToString() == id);
            if (charge != null)
            {
                charge.ChargeType = description;
            }
            else
            {
                throw new ArgumentOutOfRangeException();
            }
        }

        public void SaveStableChargeTypeChargeRate(string id, string rate)
        {
            var charge = StableChargeTypes.SingleOrDefault(ch => ch.StableChargeTypeId.ToString() == id);
            if (charge != null)
            {
                charge.ChargeRate = rate;
            }
            else
            {
                throw new ArgumentOutOfRangeException();
            }
        }

        public void SaveStandardChargeTypeChargeRate(string id, string rate)
        {
            var charge = StableChargeTypes.SingleOrDefault(ch => ch.StableChargeTypeId.ToString() == id);
            if (charge != null)
            {
                charge.ChargeRate = rate;
            }
            else
            {
                throw new ArgumentOutOfRangeException();
            }
        }

        public void SaveStandardChargeTypeChargeDescription(string id, string description)
        {
            var charge = StandardChargeTypes.SingleOrDefault(ch => ch.StandardChargeId.ToString() == id);
            if (charge != null)
            {
                charge.Description = description;
            }
            else
            {
                throw new ArgumentOutOfRangeException();
            }
        }

        public void StableCharges(List<WizardController.UiStableCharge> charges)
        {
            foreach (var charge in charges)
            {
                var chargeToUpdate = StableChargeTypes.First(ch => ch.StableChargeTypeId.ToString() == charge.Id);
                chargeToUpdate.ChargeRate = charge.Rate;
                chargeToUpdate.ChargeType = charge.Description;
                chargeToUpdate.ChargingUnit = charge.Unit;
                chargeToUpdate.InStable = charge.InStable == "true";
            }
        }
    }
}