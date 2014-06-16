using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using EStable.Constants;

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
                            new StableChargeType("Full Training","$","Daily",true),
                            new StableChargeType("Pre-Training","$","Daily",true),
                            new StableChargeType("Spelling","$","Daily",true),
                            new StableChargeType("Grazing","$","Daily",true),
                            new StableChargeType( "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge("Track Fees","$"),
                            new StandardCharge("Vitamins","$")
                        };
                    break;
                case Codes.StableType.Pacer:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType("Full Training","$","Daily",true),
                            new StableChargeType("Pre-Training","$","Daily",true),
                            new StableChargeType("Spelling","$","Daily",true),
                            new StableChargeType("Grazing","$","Daily",true),
                            new StableChargeType( "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge("Track Fees","$"),
                            new StandardCharge("Vitamins","$")
                        };
                    break;
                case Codes.StableType.Thoroughbred:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType("Full Training","$","Daily",true),
                            new StableChargeType("Pre-Training","$","Daily",true),
                            new StableChargeType("Spelling","$","Daily",true),
                            new StableChargeType("Grazing","$","Daily",true),
                            new StableChargeType( "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge("Track Fees","$"),
                            new StandardCharge("Vitamins","$")
                        };
                    break;
                case Codes.StableType.Trotter:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType("Full Training","$","Daily",true),
                            new StableChargeType("Pre-Training","$","Daily",true),
                            new StableChargeType("Spelling","$","Daily",true),
                            new StableChargeType("Grazing","$","Daily",true),
                            new StableChargeType( "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge("Track Fees","$"),
                            new StandardCharge("Vitamins","$")
                        };
                    break;
                default:
                    StableChargeTypes = new List<StableChargeType>()
                        {
                            new StableChargeType("Full Training","$","Daily",true),
                            new StableChargeType("Pre-Training","$","Daily",true),
                            new StableChargeType("Spelling","$","Daily",true),
                            new StableChargeType("Grazing","$","Daily",true),
                            new StableChargeType( "Left Stable","0.00","Daily",false)
                        };
                    StandardChargeTypes = new List<StandardCharge>()
                        {
                            new StandardCharge("Track Fees","$"),
                            new StandardCharge("Vitamins","$")
                        };
                    break;
            }
            #endregion
        }

        public void AddStableChargeType(StableChargeType stableChargeType)
        {
            stableChargeType.StableChargeTypeId = StableChargeTypes.Count;
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

        public void SaveStableChargeTypeInstable(string id, string instable)
        {
            var charge = StableChargeTypes.SingleOrDefault(ch => ch.StableChargeTypeId.ToString() == id);
            if (charge != null)
            {
                charge.InStable = instable == "yes";
            }
            else
            {
                throw new ArgumentOutOfRangeException();
            }
        }
    }
}