﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models.Wizard;
using EStable.Services;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;

namespace EStable.Bouncers
{
    public interface IStandardChargeTypeBouncer
    {
        List<StandardChargeTypeViewModel> SaveStandardCharge(string description, string rate, string email);
        ChargeTypesWizard ImportStandardCharges(HttpPostedFileBase file, string email);
    }

    public class StandardChargeTypeBouncer : IStandardChargeTypeBouncer
    {
        readonly IStandardChargeTypeService _service = new StandardChargeTypeService();
 
        public List<StandardChargeTypeViewModel> SaveStandardCharge(string description, string rate, string email)
        {
            return _service.SaveStandardCharge(description, rate, email);
        }

        public ChargeTypesWizard ImportStandardCharges(HttpPostedFileBase file, string email)
        {
            return _service.ImportStableCharges(file, email);
        }
    }
}