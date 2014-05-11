using System;
using System.Collections.Generic;
using System.Linq;
using EStable.Models;
using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.Factories
{
    public interface IChargeTypeViewModelFactory
    {
        ChargeTypesViewModel ToViewModel(ChargeTypesWizard chargeTypes);
        ChargeTypesWizard ToDomainObject(ChargeTypesViewModel viewModel);
        List<StableChargeTypeViewModel> ToViewModel(IEnumerable<StableChargeType> stableChargeTypes);
        List<StandardChargeTypeViewModel> ToViewModel(IEnumerable<StandardCharge> standardChargeTypes);
    }

    public class ChargeTypeViewModelFactory :IChargeTypeViewModelFactory
    {
        public ChargeTypesViewModel ToViewModel(ChargeTypesWizard chargeTypes)
        {
            return new ChargeTypesViewModel
                {
                    Email = chargeTypes.Email,
                    StableName = chargeTypes.StableName,
                    StableChargeTypes = ToViewModel(chargeTypes.StableChargeTypes),
                    StandardChargeTypes = ToViewModel(chargeTypes.StandardChargeTypes)
                };
        }

        public List<StandardChargeTypeViewModel> ToViewModel(IEnumerable<StandardCharge> standardChargeTypes)
        {
            return standardChargeTypes.Select(ToViewModel).ToList();
        }

        public List<StableChargeTypeViewModel> ToViewModel(IEnumerable<StableChargeType> standardChargeTypes)
        {
            return standardChargeTypes.Select(ToViewModel).ToList();
        }

        private StandardChargeTypeViewModel ToViewModel(StandardCharge standardChargeTypes)
        {
            return new StandardChargeTypeViewModel()
                {
                    Description = standardChargeTypes.Description,
                    Id = standardChargeTypes.StandardChargeId,
                    Rate = standardChargeTypes.Value
                };
        }

        private StableChargeTypeViewModel ToViewModel(StableChargeType stableChargeTypes)
        {
            return new StableChargeTypeViewModel()
                {
                    Description = stableChargeTypes.ChargeType,
                    Id = stableChargeTypes.StableChargeTypeId,
                    InStable = stableChargeTypes.InStable,
                    Rate = stableChargeTypes.ChargeRate,
                    Unit = stableChargeTypes.ChargingUnit
                };
        }

        public ChargeTypesWizard ToDomainObject(ChargeTypesViewModel viewModel)
        {
            throw new NotImplementedException();
        }

    }
}