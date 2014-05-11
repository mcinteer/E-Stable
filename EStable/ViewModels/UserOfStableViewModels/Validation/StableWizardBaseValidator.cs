using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models.Wizard;
using FluentValidation;

namespace EStable.ViewModels.UserOfStableViewModels.Validation
{
    public class StableWizardBaseValidator :AbstractValidator<StableWizardBase>
    {
        public StableWizardBaseValidator()
        {
            RuleFor(it => it.Email)
                .EmailAddress()
                .WithMessage(ValidationMessages.EmailAddressInvalid);
            RuleFor(it => it.StableName)
                .Length(0, 50)
                .WithMessage(ValidationMessages.StableName_IncorrectLength);
        }
    }
}