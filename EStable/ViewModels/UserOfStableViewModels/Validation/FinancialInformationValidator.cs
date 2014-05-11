using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepTwo;
using FluentValidation;

namespace EStable.ViewModels.UserOfStableViewModels.Validation
{
    public class FinancialInformationValidator :AbstractValidator<FinancialInformationViewModel>
    {
        public FinancialInformationValidator()
        {
            RuleFor(x => x.GSTNumber)
                .Matches(@"\d")
                .Length(9)
                .WithMessage(ValidationMessages.GstNumberInvalid);
            RuleFor(x => x.GSTRate)
                .Matches(@"\d")
                .Length(1,3)
                .WithMessage(ValidationMessages.GstRateInvalid);
            RuleFor(x => x.GSTRate)
                .NotEmpty()
                .WithMessage(ValidationMessages.GstRateShouldNotBeEmpty);
            RuleFor(x => x.PreviousGSTRate)
                .Matches(@"\d")
                .Length(0,3)
                .WithMessage(ValidationMessages.PreviousGstRate_ShouldNotBeEmpty);
        }
    }
}