using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Repositories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;

namespace EStable.Services
{
    public interface IStableChargeTypeService
    {
        List<StableChargeTypeViewModel> SaveStableCharge(string unit, string instable, string description, string rate, string email);
    }

    public class StableChargeTypeService : IStableChargeTypeService
    {
        private readonly WizardService _wizardService = 
            new WizardService();
        private readonly IChargeTypeViewModelFactory _factory =
            new ChargeTypeViewModelFactory();

        public List<StableChargeTypeViewModel> SaveStableCharge(string unit, string instable, string description, string rate, string email)
        {
            var stableChargeType = new StableChargeType(unit, instable, description, rate);
            
            var wizard = _wizardService.GetWizard(email); 
            wizard.AddStableCharge(stableChargeType);
            
            var fileName = _wizardService.GetStableRegFileInfo(email);
            wizard.SaveXml(fileName.SystemFileName);
            
            return _factory.ToViewModel(wizard.ChargeTypes.StableChargeTypes);
        }
    }
}