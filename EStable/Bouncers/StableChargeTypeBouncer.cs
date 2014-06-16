using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models.Wizard;
using EStable.Security;
using EStable.Services;
using EStable.Validation;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;

namespace EStable.Bouncers
{
    public interface IStableChargeTypeBouncer
    {
        List<StableChargeTypeViewModel> SaveNewStableCharge(string unit, string instable, string description, string rate, string email);
        ChargeTypesWizard ImportStableCharges(HttpPostedFileBase file, string email);
        List<StableChargeTypeViewModel> UpdateStableChargeUnit(string id, string unit, string email);
        List<StableChargeTypeViewModel> UpdateStableChargeInstable(string id, string instable, string email);
    }

    public class StableChargeTypeBouncer : IStableChargeTypeBouncer
    {
        readonly IStableChargeTypeService _service = new StableChargeTypeService();
        //TODO readonly IStableChargeTypeValidator _validator = new StableChargeTypeValidator();

        public List<StableChargeTypeViewModel> SaveNewStableCharge(string unit, string instable, string description, string rate, string email)
        {
            //TODO: _validator.Validate(unit, instable, description, rate, email);
            return _service.SaveStableCharge(unit, instable, description, rate, email);
        }

        public ChargeTypesWizard ImportStableCharges(HttpPostedFileBase file, string email)
        {
            return _service.ImportStableCharges(file, email);
        }

        public List<StableChargeTypeViewModel> UpdateStableChargeUnit(string id, string unit, string email)
        {
            return _service.UpdateStableChargeUnit(id, unit, email);
        }

        public List<StableChargeTypeViewModel> UpdateStableChargeInstable(string id, string instable, string email)
        {
            return _service.UpdateStableChargeInstable(id, instable, email);
        }
    }
}