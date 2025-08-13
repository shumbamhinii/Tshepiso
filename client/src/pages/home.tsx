import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, FileText, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-amber-600 mb-4">
            Tshepiso Branding Solutions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional pricing calculator and quotation management system designed to help you optimize your business pricing strategy
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                <Calculator className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Pricing Calculator</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Calculate optimal pricing for your products and services with advanced algorithms, competitor analysis, and profit optimization
              </p>
              <Link href="/pricing-calculator">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold">
                  Start Calculating
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                <FileText className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Quotation Manager</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Generate professional quotations for your clients with customizable templates and automated calculations
              </p>
              <Link href="/quotations">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold">
                  Create Quotations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Analytics</h3>
            <p className="text-gray-600">
              Get insights into your pricing performance with detailed analytics and reporting
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Competitor Analysis</h3>
            <p className="text-gray-600">
              Track competitor pricing and get recommendations for competitive positioning
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Calculator className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Scenario Planning</h3>
            <p className="text-gray-600">
              Test different pricing scenarios and budget allocations to optimize profitability
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}